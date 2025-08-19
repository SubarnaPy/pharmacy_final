#!/bin/bash

# Advanced Notification System - Production Deployment Script
# This script handles the complete deployment process with safety checks

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_ENV=${1:-production}
DEPLOYMENT_VERSION=${2:-$(git rev-parse --short HEAD)}
BACKUP_RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment configuration
load_config() {
    local config_file="$SCRIPT_DIR/../config/$DEPLOYMENT_ENV.env"
    
    if [ ! -f "$config_file" ]; then
        log_error "Configuration file not found: $config_file"
        exit 1
    fi
    
    log_info "Loading configuration for environment: $DEPLOYMENT_ENV"
    source "$config_file"
    
    # Validate required environment variables
    local required_vars=(
        "NODE_ENV"
        "MONGODB_URI"
        "REDIS_URL"
        "SENDGRID_API_KEY"
        "TWILIO_ACCOUNT_SID"
        "TWILIO_AUTH_TOKEN"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    log_success "Configuration loaded successfully"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if services are running
    if ! systemctl is-active --quiet mongodb; then
        log_error "MongoDB is not running"
        exit 1
    fi
    
    if ! systemctl is-active --quiet redis; then
        log_error "Redis is not running"
        exit 1
    fi
    
    # Check database connectivity
    if ! mongosh "$MONGODB_URI" --quiet --eval "db.runCommand('ping')" > /dev/null 2>&1; then
        log_error "Cannot connect to MongoDB"
        exit 1
    fi
    
    if ! redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
        log_error "Cannot connect to Redis"
        exit 1
    fi
    
    # Check external service connectivity
    if ! curl -s -f -X GET "https://api.sendgrid.com/v3/user/profile" \
        -H "Authorization: Bearer $SENDGRID_API_KEY" > /dev/null; then
        log_warning "SendGrid API connectivity check failed"
    fi
    
    if ! curl -s -f -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
        -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" > /dev/null; then
        log_warning "Twilio API connectivity check failed"
    fi
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        log_error "Disk usage is too high: ${disk_usage}%"
        exit 1
    fi
    
    # Check available memory
    local available_memory=$(free | grep '^Mem:' | awk '{print ($7/$2)*100}')
    if (( $(echo "$available_memory < 20" | bc -l) )); then
        log_warning "Low available memory: ${available_memory}%"
    fi
    
    log_success "Pre-deployment checks completed"
}

# Create backup before deployment
create_backup() {
    log_info "Creating backup before deployment..."
    
    local backup_dir="/backups/notification-system"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="pre_deployment_${timestamp}_${DEPLOYMENT_VERSION}"
    
    mkdir -p "$backup_dir"
    
    # Database backup
    log_info "Backing up MongoDB..."
    mongodump --uri="$MONGODB_URI" --out="$backup_dir/${backup_name}_mongodb" --gzip
    
    # Redis backup
    log_info "Backing up Redis..."
    redis-cli -u "$REDIS_URL" --rdb "$backup_dir/${backup_name}_redis.rdb"
    
    # Application configuration backup
    log_info "Backing up application configuration..."
    tar -czf "$backup_dir/${backup_name}_config.tar.gz" \
        "$PROJECT_ROOT/.env" \
        "$PROJECT_ROOT/ecosystem.config.js" \
        "/etc/nginx/sites-available/notification-service" 2>/dev/null || true
    
    # Create backup manifest
    cat > "$backup_dir/${backup_name}_manifest.json" << EOF
{
  "timestamp": "$timestamp",
  "version": "$DEPLOYMENT_VERSION",
  "environment": "$DEPLOYMENT_ENV",
  "files": {
    "mongodb": "${backup_name}_mongodb",
    "redis": "${backup_name}_redis.rdb",
    "config": "${backup_name}_config.tar.gz"
  },
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)"
}
EOF
    
    # Compress entire backup
    tar -czf "$backup_dir/${backup_name}.tar.gz" \
        "$backup_dir/${backup_name}_mongodb" \
        "$backup_dir/${backup_name}_redis.rdb" \
        "$backup_dir/${backup_name}_config.tar.gz" \
        "$backup_dir/${backup_name}_manifest.json"
    
    # Cleanup individual files
    rm -rf "$backup_dir/${backup_name}_mongodb"
    rm -f "$backup_dir/${backup_name}_redis.rdb"
    rm -f "$backup_dir/${backup_name}_config.tar.gz"
    rm -f "$backup_dir/${backup_name}_manifest.json"
    
    # Upload to cloud storage if configured
    if [ -n "$AWS_S3_BACKUP_BUCKET" ]; then
        log_info "Uploading backup to S3..."
        aws s3 cp "$backup_dir/${backup_name}.tar.gz" \
            "s3://$AWS_S3_BACKUP_BUCKET/notification-system/"
    fi
    
    # Cleanup old backups
    find "$backup_dir" -name "pre_deployment_*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
    
    echo "$backup_dir/${backup_name}.tar.gz" > /tmp/latest_backup_path
    log_success "Backup created: ${backup_name}.tar.gz"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Check if migrations are needed
    if [ -f "migrations/migrate.js" ]; then
        node migrations/migrate.js up
        log_success "Database migrations completed"
    else
        log_info "No migrations to run"
    fi
}

# Build and test application
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm ci --production
    
    # Run tests
    if [ "$DEPLOYMENT_ENV" != "production" ] || [ "$SKIP_TESTS" != "true" ]; then
        log_info "Running tests..."
        npm test
        log_success "Tests passed"
    fi
    
    # Build application if needed
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        npm run build
        log_success "Application built successfully"
    fi
}

# Deploy application using blue-green strategy
deploy_application() {
    log_info "Deploying application using blue-green strategy..."
    
    # Determine current and new colors
    local current_color=$(curl -s http://localhost/health 2>/dev/null | jq -r '.color // "blue"')
    local new_color=$([ "$current_color" = "blue" ] && echo "green" || echo "blue")
    local new_port=$([ "$new_color" = "blue" ] && echo "5000" || echo "5001")
    
    log_info "Current deployment: $current_color"
    log_info "Deploying to: $new_color on port $new_port"
    
    # Stop existing process for new color
    pm2 delete "notification-$new_color" 2>/dev/null || true
    
    # Start new deployment
    cd "$PROJECT_ROOT"
    PORT=$new_port NODE_ENV=$DEPLOYMENT_ENV pm2 start ecosystem.config.js --name "notification-$new_color"
    
    # Wait for application to be ready
    log_info "Waiting for application to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f "http://localhost:$new_port/health" > /dev/null 2>&1; then
            log_success "Application is ready on port $new_port"
            break
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Application failed to start within timeout"
        pm2 delete "notification-$new_color"
        exit 1
    fi
    
    # Run smoke tests
    run_smoke_tests "$new_port"
    
    # Update load balancer configuration
    update_load_balancer "$new_color" "$new_port"
    
    # Wait for traffic to switch
    sleep 10
    
    # Stop old deployment
    if [ "$current_color" != "$new_color" ]; then
        pm2 delete "notification-$current_color" 2>/dev/null || true
        log_success "Old deployment ($current_color) stopped"
    fi
    
    # Save PM2 configuration
    pm2 save
    
    log_success "Deployment completed successfully"
}

# Run smoke tests
run_smoke_tests() {
    local port=$1
    log_info "Running smoke tests on port $port..."
    
    # Health check
    if ! curl -f "http://localhost:$port/health"; then
        log_error "Health check failed"
        return 1
    fi
    
    # API endpoint test
    if ! curl -f "http://localhost:$port/api/v1/notifications/health"; then
        log_error "API health check failed"
        return 1
    fi
    
    # Database connectivity test
    local db_status=$(curl -s "http://localhost:$port/health" | jq -r '.checks.database // "unknown"')
    if [ "$db_status" != "healthy" ]; then
        log_error "Database connectivity test failed"
        return 1
    fi
    
    # Redis connectivity test
    local redis_status=$(curl -s "http://localhost:$port/health" | jq -r '.checks.redis // "unknown"')
    if [ "$redis_status" != "healthy" ]; then
        log_error "Redis connectivity test failed"
        return 1
    fi
    
    log_success "Smoke tests passed"
}

# Update load balancer configuration
update_load_balancer() {
    local color=$1
    local port=$2
    
    log_info "Updating load balancer configuration..."
    
    # Update nginx upstream configuration
    local nginx_config="/etc/nginx/sites-available/notification-service"
    
    if [ -f "$nginx_config" ]; then
        # Create backup of current config
        cp "$nginx_config" "${nginx_config}.backup.$(date +%s)"
        
        # Update upstream server
        sed -i "s/server 127.0.0.1:[0-9]*/server 127.0.0.1:$port/" "$nginx_config"
        
        # Test nginx configuration
        if nginx -t; then
            # Reload nginx
            systemctl reload nginx
            log_success "Load balancer updated to use port $port"
        else
            log_error "Nginx configuration test failed"
            # Restore backup
            cp "${nginx_config}.backup.$(date +%s)" "$nginx_config"
            exit 1
        fi
    else
        log_warning "Nginx configuration file not found: $nginx_config"
    fi
}

# Post-deployment verification
post_deployment_verification() {
    log_info "Running post-deployment verification..."
    
    # Wait for system to stabilize
    sleep 30
    
    # Check application status
    if ! pm2 list | grep -q "notification-"; then
        log_error "No notification service processes found"
        exit 1
    fi
    
    # Check system health
    local health_response=$(curl -s http://localhost/health)
    local health_status=$(echo "$health_response" | jq -r '.status // "unknown"')
    
    if [ "$health_status" != "healthy" ]; then
        log_error "System health check failed: $health_status"
        echo "$health_response" | jq .
        exit 1
    fi
    
    # Check notification queue processing
    local queue_size=$(redis-cli -u "$REDIS_URL" LLEN notification_queue)
    log_info "Current notification queue size: $queue_size"
    
    # Send test notification
    log_info "Sending test notification..."
    local test_response=$(curl -s -X POST http://localhost/api/v1/notifications/test \
        -H "Content-Type: application/json" \
        -d '{"type": "deployment_test", "message": "Deployment verification test"}')
    
    local test_status=$(echo "$test_response" | jq -r '.success // false')
    if [ "$test_status" != "true" ]; then
        log_warning "Test notification failed"
    else
        log_success "Test notification sent successfully"
    fi
    
    # Check external service connectivity
    check_external_services
    
    log_success "Post-deployment verification completed"
}

# Check external services
check_external_services() {
    log_info "Checking external service connectivity..."
    
    # SendGrid
    if curl -s -f -X GET "https://api.sendgrid.com/v3/user/profile" \
        -H "Authorization: Bearer $SENDGRID_API_KEY" > /dev/null; then
        log_success "SendGrid connectivity: OK"
    else
        log_warning "SendGrid connectivity: FAILED"
    fi
    
    # Twilio
    if curl -s -f -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
        -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" > /dev/null; then
        log_success "Twilio connectivity: OK"
    else
        log_warning "Twilio connectivity: FAILED"
    fi
}

# Rollback function
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    local backup_path=$(cat /tmp/latest_backup_path 2>/dev/null)
    
    if [ -z "$backup_path" ] || [ ! -f "$backup_path" ]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    log_info "Using backup: $backup_path"
    
    # Stop current application
    pm2 stop all
    
    # Restore from backup
    "$SCRIPT_DIR/rollback.sh" "$backup_path"
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove temporary files
    rm -f /tmp/latest_backup_path
    rm -f /tmp/deployment_*.log
    
    # Clean up old PM2 logs
    pm2 flush
    
    log_success "Cleanup completed"
}

# Signal handlers for graceful shutdown
trap 'log_error "Deployment interrupted"; cleanup; exit 1' INT TERM

# Main deployment function
main() {
    log_info "Starting deployment of Advanced Notification System"
    log_info "Environment: $DEPLOYMENT_ENV"
    log_info "Version: $DEPLOYMENT_VERSION"
    log_info "Timestamp: $(date)"
    
    # Load configuration
    load_config
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Create backup
    create_backup
    
    # Run database migrations
    run_migrations
    
    # Build application
    build_application
    
    # Deploy application
    deploy_application
    
    # Post-deployment verification
    post_deployment_verification
    
    # Cleanup
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Application is now running on: http://localhost"
    log_info "Health check: http://localhost/health"
}

# Help function
show_help() {
    cat << EOF
Advanced Notification System - Deployment Script

Usage: $0 [ENVIRONMENT] [VERSION]

Arguments:
  ENVIRONMENT    Deployment environment (default: production)
  VERSION        Deployment version (default: current git commit)

Examples:
  $0                          # Deploy to production with current commit
  $0 staging                  # Deploy to staging environment
  $0 production v1.2.3        # Deploy specific version to production

Environment Variables:
  SKIP_TESTS=true             # Skip running tests during deployment
  AWS_S3_BACKUP_BUCKET        # S3 bucket for backup storage

Commands:
  help                        # Show this help message
  rollback                    # Rollback to previous deployment

EOF
}

# Command handling
case "${1:-}" in
    help|--help|-h)
        show_help
        exit 0
        ;;
    rollback)
        rollback_deployment
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac