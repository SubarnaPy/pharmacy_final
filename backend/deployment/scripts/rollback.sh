#!/bin/bash

# Advanced Notification System - Rollback Script
# This script handles rollback to a previous deployment state

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_PATH=${1}
ROLLBACK_TIMEOUT=300  # 5 minutes

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

# Validate backup file
validate_backup() {
    if [ -z "$BACKUP_PATH" ]; then
        log_error "Backup path not provided"
        show_help
        exit 1
    fi
    
    if [ ! -f "$BACKUP_PATH" ]; then
        log_error "Backup file not found: $BACKUP_PATH"
        exit 1
    fi
    
    # Check if backup file is valid
    if ! tar -tzf "$BACKUP_PATH" > /dev/null 2>&1; then
        log_error "Invalid backup file format"
        exit 1
    fi
    
    log_success "Backup file validated: $BACKUP_PATH"
}

# Extract backup information
extract_backup_info() {
    log_info "Extracting backup information..."
    
    local temp_dir="/tmp/rollback_$$"
    mkdir -p "$temp_dir"
    
    # Extract manifest file
    tar -xzf "$BACKUP_PATH" -C "$temp_dir" --wildcards "*_manifest.json" 2>/dev/null || {
        log_warning "No manifest file found in backup"
        return 0
    }
    
    local manifest_file=$(find "$temp_dir" -name "*_manifest.json" | head -1)
    
    if [ -f "$manifest_file" ]; then
        log_info "Backup Information:"
        cat "$manifest_file" | jq .
        
        # Extract key information
        BACKUP_TIMESTAMP=$(cat "$manifest_file" | jq -r '.timestamp // "unknown"')
        BACKUP_VERSION=$(cat "$manifest_file" | jq -r '.version // "unknown"')
        BACKUP_ENVIRONMENT=$(cat "$manifest_file" | jq -r '.environment // "unknown"')
        
        log_info "Backup Timestamp: $BACKUP_TIMESTAMP"
        log_info "Backup Version: $BACKUP_VERSION"
        log_info "Backup Environment: $BACKUP_ENVIRONMENT"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Create pre-rollback backup
create_pre_rollback_backup() {
    log_info "Creating pre-rollback backup..."
    
    local backup_dir="/backups/notification-system"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="pre_rollback_${timestamp}"
    
    mkdir -p "$backup_dir"
    
    # Quick database backup
    if command -v mongodump > /dev/null; then
        mongodump --uri="$MONGODB_URI" --out="$backup_dir/${backup_name}_mongodb" --gzip
    fi
    
    # Quick Redis backup
    if command -v redis-cli > /dev/null; then
        redis-cli -u "$REDIS_URL" --rdb "$backup_dir/${backup_name}_redis.rdb" 2>/dev/null || true
    fi
    
    # Application state backup
    tar -czf "$backup_dir/${backup_name}_app.tar.gz" \
        "$PROJECT_ROOT" \
        --exclude="$PROJECT_ROOT/node_modules" \
        --exclude="$PROJECT_ROOT/.git" 2>/dev/null || true
    
    log_success "Pre-rollback backup created: ${backup_name}"
}

# Stop current services
stop_services() {
    log_info "Stopping current services..."
    
    # Stop PM2 processes
    pm2 stop all 2>/dev/null || true
    
    # Wait for processes to stop
    sleep 5
    
    # Force kill if necessary
    pkill -f "notification-service" 2>/dev/null || true
    
    log_success "Services stopped"
}

# Restore database from backup
restore_database() {
    log_info "Restoring database from backup..."
    
    local temp_dir="/tmp/rollback_restore_$$"
    mkdir -p "$temp_dir"
    
    # Extract backup
    tar -xzf "$BACKUP_PATH" -C "$temp_dir"
    
    # Find MongoDB backup directory
    local mongodb_backup=$(find "$temp_dir" -type d -name "*_mongodb" | head -1)
    
    if [ -d "$mongodb_backup" ]; then
        log_info "Restoring MongoDB from: $mongodb_backup"
        
        # Create a backup of current database before restore
        local current_backup="/tmp/current_db_backup_$$"
        mongodump --uri="$MONGODB_URI" --out="$current_backup" --gzip 2>/dev/null || true
        
        # Restore from backup
        if mongorestore --uri="$MONGODB_URI" --drop "$mongodb_backup"; then
            log_success "MongoDB restored successfully"
            rm -rf "$current_backup"
        else
            log_error "MongoDB restore failed"
            # Attempt to restore current backup
            if [ -d "$current_backup" ]; then
                log_info "Attempting to restore current database..."
                mongorestore --uri="$MONGODB_URI" --drop "$current_backup"
            fi
            rm -rf "$temp_dir"
            exit 1
        fi
    else
        log_warning "No MongoDB backup found in backup file"
    fi
    
    # Find Redis backup file
    local redis_backup=$(find "$temp_dir" -name "*_redis.rdb" | head -1)
    
    if [ -f "$redis_backup" ]; then
        log_info "Restoring Redis from: $redis_backup"
        
        # Stop Redis temporarily
        systemctl stop redis 2>/dev/null || true
        
        # Backup current Redis data
        cp /var/lib/redis/dump.rdb "/tmp/redis_current_backup_$$.rdb" 2>/dev/null || true
        
        # Restore Redis backup
        cp "$redis_backup" /var/lib/redis/dump.rdb
        chown redis:redis /var/lib/redis/dump.rdb 2>/dev/null || true
        
        # Start Redis
        systemctl start redis
        
        # Verify Redis is working
        if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
            log_success "Redis restored successfully"
            rm -f "/tmp/redis_current_backup_$$.rdb"
        else
            log_error "Redis restore failed"
            # Restore current backup
            systemctl stop redis
            cp "/tmp/redis_current_backup_$$.rdb" /var/lib/redis/dump.rdb 2>/dev/null || true
            systemctl start redis
            rm -rf "$temp_dir"
            exit 1
        fi
    else
        log_warning "No Redis backup found in backup file"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Restore application configuration
restore_application() {
    log_info "Restoring application configuration..."
    
    local temp_dir="/tmp/rollback_app_$$"
    mkdir -p "$temp_dir"
    
    # Extract configuration backup
    tar -xzf "$BACKUP_PATH" -C "$temp_dir" --wildcards "*_config.tar.gz" 2>/dev/null || {
        log_warning "No configuration backup found"
        return 0
    }
    
    local config_backup=$(find "$temp_dir" -name "*_config.tar.gz" | head -1)
    
    if [ -f "$config_backup" ]; then
        log_info "Restoring configuration from: $config_backup"
        
        # Extract configuration files
        tar -xzf "$config_backup" -C / 2>/dev/null || {
            log_warning "Failed to extract configuration backup"
        }
        
        log_success "Configuration restored"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Restore application code (if needed)
restore_application_code() {
    log_info "Checking if application code restore is needed..."
    
    # For now, we assume code is managed by git
    # In a more complex setup, you might restore application files from backup
    
    cd "$PROJECT_ROOT"
    
    # If backup contains git commit information, checkout that commit
    local temp_dir="/tmp/rollback_manifest_$$"
    mkdir -p "$temp_dir"
    
    tar -xzf "$BACKUP_PATH" -C "$temp_dir" --wildcards "*_manifest.json" 2>/dev/null || {
        log_info "No manifest found, skipping code restore"
        rm -rf "$temp_dir"
        return 0
    }
    
    local manifest_file=$(find "$temp_dir" -name "*_manifest.json" | head -1)
    
    if [ -f "$manifest_file" ]; then
        local git_commit=$(cat "$manifest_file" | jq -r '.git_commit // ""')
        
        if [ -n "$git_commit" ] && [ "$git_commit" != "null" ]; then
            log_info "Restoring code to commit: $git_commit"
            
            # Stash current changes
            git stash push -m "Pre-rollback stash $(date)"
            
            # Checkout the commit
            if git checkout "$git_commit"; then
                log_success "Code restored to commit: $git_commit"
            else
                log_error "Failed to checkout commit: $git_commit"
                # Try to restore to previous state
                git stash pop 2>/dev/null || true
                rm -rf "$temp_dir"
                exit 1
            fi
        fi
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Reinstall dependencies
reinstall_dependencies() {
    log_info "Reinstalling dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Remove node_modules and package-lock.json
    rm -rf node_modules package-lock.json
    
    # Install dependencies
    if npm ci --production; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Start services
start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_ROOT"
    
    # Load environment configuration
    local env_file="$SCRIPT_DIR/../config/production.env"
    if [ -f "$env_file" ]; then
        source "$env_file"
    fi
    
    # Start application with PM2
    if pm2 start ecosystem.config.js; then
        log_success "Application started with PM2"
    else
        log_error "Failed to start application"
        exit 1
    fi
    
    # Save PM2 configuration
    pm2 save
}

# Verify rollback
verify_rollback() {
    log_info "Verifying rollback..."
    
    local max_attempts=30
    local attempt=0
    
    # Wait for application to be ready
    while [ $attempt -lt $max_attempts ]; do
        if curl -f "http://localhost:5000/health" > /dev/null 2>&1; then
            log_success "Application is responding"
            break
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Application failed to start within timeout"
        exit 1
    fi
    
    # Check system health
    local health_response=$(curl -s http://localhost:5000/health)
    local health_status=$(echo "$health_response" | jq -r '.status // "unknown"')
    
    if [ "$health_status" = "healthy" ]; then
        log_success "System health check passed"
    else
        log_error "System health check failed: $health_status"
        echo "$health_response" | jq .
        exit 1
    fi
    
    # Check database connectivity
    local db_status=$(echo "$health_response" | jq -r '.checks.database // "unknown"')
    if [ "$db_status" = "healthy" ]; then
        log_success "Database connectivity verified"
    else
        log_warning "Database connectivity issue: $db_status"
    fi
    
    # Check Redis connectivity
    local redis_status=$(echo "$health_response" | jq -r '.checks.redis // "unknown"')
    if [ "$redis_status" = "healthy" ]; then
        log_success "Redis connectivity verified"
    else
        log_warning "Redis connectivity issue: $redis_status"
    fi
    
    log_success "Rollback verification completed"
}

# Update load balancer (if needed)
update_load_balancer() {
    log_info "Updating load balancer configuration..."
    
    local nginx_config="/etc/nginx/sites-available/notification-service"
    
    if [ -f "$nginx_config" ]; then
        # Test nginx configuration
        if nginx -t; then
            # Reload nginx
            systemctl reload nginx
            log_success "Load balancer configuration updated"
        else
            log_warning "Nginx configuration test failed"
        fi
    else
        log_info "No nginx configuration found"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove temporary files
    rm -f /tmp/rollback_*
    rm -f /tmp/current_db_backup_*
    rm -f /tmp/redis_current_backup_*
    
    log_success "Cleanup completed"
}

# Show help
show_help() {
    cat << EOF
Advanced Notification System - Rollback Script

Usage: $0 <BACKUP_PATH>

Arguments:
  BACKUP_PATH    Path to the backup file to restore from

Examples:
  $0 /backups/notification-system/pre_deployment_20240115_143022.tar.gz
  $0 /backups/notification-system/backup_20240115_120000.tar.gz

The script will:
1. Validate the backup file
2. Create a pre-rollback backup of current state
3. Stop current services
4. Restore database from backup
5. Restore application configuration
6. Restore application code (if needed)
7. Reinstall dependencies
8. Start services
9. Verify the rollback

EOF
}

# Signal handlers for graceful shutdown
trap 'log_error "Rollback interrupted"; cleanup; exit 1' INT TERM

# Main rollback function
main() {
    log_info "Starting rollback of Advanced Notification System"
    log_info "Backup file: $BACKUP_PATH"
    log_info "Timestamp: $(date)"
    
    # Validate backup
    validate_backup
    
    # Extract backup information
    extract_backup_info
    
    # Confirm rollback
    echo -n "Are you sure you want to rollback to this backup? [y/N]: "
    read -r confirmation
    
    if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
        log_info "Rollback cancelled by user"
        exit 0
    fi
    
    # Create pre-rollback backup
    create_pre_rollback_backup
    
    # Stop services
    stop_services
    
    # Restore database
    restore_database
    
    # Restore application configuration
    restore_application
    
    # Restore application code
    restore_application_code
    
    # Reinstall dependencies
    reinstall_dependencies
    
    # Start services
    start_services
    
    # Update load balancer
    update_load_balancer
    
    # Verify rollback
    verify_rollback
    
    # Cleanup
    cleanup
    
    log_success "Rollback completed successfully!"
    log_info "Application is now running the restored version"
    log_info "Health check: http://localhost:5000/health"
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

case "${1:-}" in
    help|--help|-h)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac