#!/bin/bash

# Advanced Notification System - Gradual Rollout Script
# This script implements gradual rollout with feature flags and monitoring

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FEATURE_FLAGS_FILE="$SCRIPT_DIR/../feature-flags/feature-flags.json"
ROLLOUT_STRATEGY=${1:-gradualRollout}
FEATURE_NAME=${2}
TARGET_PERCENTAGE=${3:-100}

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

# Load feature flags
load_feature_flags() {
    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found: $FEATURE_FLAGS_FILE"
        exit 1
    fi
    
    log_info "Loading feature flags from: $FEATURE_FLAGS_FILE"
}

# Update feature flag rollout percentage
update_feature_flag() {
    local feature_name=$1
    local percentage=$2
    
    log_info "Updating feature flag '$feature_name' to $percentage%"
    
    # Use jq to update the feature flag
    local temp_file=$(mktemp)
    jq --arg feature "$feature_name" --argjson percentage "$percentage" '
        .featureFlags.notifications[$feature].rolloutPercentage = $percentage |
        .metadata.lastUpdated = now | strftime("%Y-%m-%dT%H:%M:%SZ") |
        .metadata.updatedBy = "gradual-rollout-script"
    ' "$FEATURE_FLAGS_FILE" > "$temp_file"
    
    if [ $? -eq 0 ]; then
        mv "$temp_file" "$FEATURE_FLAGS_FILE"
        log_success "Feature flag updated successfully"
    else
        log_error "Failed to update feature flag"
        rm -f "$temp_file"
        exit 1
    fi
}

# Get current rollout percentage
get_current_percentage() {
    local feature_name=$1
    jq -r --arg feature "$feature_name" '.featureFlags.notifications[$feature].rolloutPercentage // 0' "$FEATURE_FLAGS_FILE"
}

# Check rollout health metrics
check_health_metrics() {
    local feature_name=$1
    local percentage=$2
    
    log_info "Checking health metrics for $feature_name at $percentage%"
    
    # Get metrics from monitoring system
    local error_rate=$(curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1] // "0"')
    local response_time=$(curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" | jq -r '.data.result[0].value[1] // "0"')
    
    # Convert to numbers for comparison
    error_rate=$(echo "$error_rate" | awk '{printf "%.4f", $1}')
    response_time=$(echo "$response_time" | awk '{printf "%.2f", $1}')
    
    log_info "Current metrics - Error rate: ${error_rate}%, Response time: ${response_time}s"
    
    # Check against thresholds
    local error_threshold=0.05  # 5%
    local response_threshold=2.0  # 2 seconds
    
    if (( $(echo "$error_rate > $error_threshold" | bc -l) )); then
        log_error "Error rate ($error_rate%) exceeds threshold ($error_threshold%)"
        return 1
    fi
    
    if (( $(echo "$response_time > $response_threshold" | bc -l) )); then
        log_error "Response time (${response_time}s) exceeds threshold (${response_threshold}s)"
        return 1
    fi
    
    log_success "Health metrics are within acceptable ranges"
    return 0
}

# Send notification about rollout status
send_rollout_notification() {
    local feature_name=$1
    local percentage=$2
    local status=$3
    
    local message="Feature rollout update: $feature_name is now at $percentage% rollout. Status: $status"
    
    # Send to Slack (if webhook is configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi
    
    # Send email notification (if configured)
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "Feature Rollout Update" "$NOTIFICATION_EMAIL" 2>/dev/null || true
    fi
    
    log_info "Rollout notification sent: $message"
}

# Rollback feature flag
rollback_feature() {
    local feature_name=$1
    local previous_percentage=$2
    
    log_warning "Rolling back feature '$feature_name' to $previous_percentage%"
    
    update_feature_flag "$feature_name" "$previous_percentage"
    send_rollout_notification "$feature_name" "$previous_percentage" "ROLLED_BACK"
    
    # Wait for rollback to take effect
    sleep 30
    
    # Verify rollback
    if check_health_metrics "$feature_name" "$previous_percentage"; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback verification failed"
        exit 1
    fi
}

# Gradual rollout strategy
gradual_rollout() {
    local feature_name=$1
    local target_percentage=$2
    
    log_info "Starting gradual rollout for feature: $feature_name"
    log_info "Target percentage: $target_percentage%"
    
    # Get rollout steps from feature flags
    local steps=$(jq -r '.rolloutStrategies.gradualRollout.steps[] | "\(.percentage) \(.duration)"' "$FEATURE_FLAGS_FILE")
    
    local current_percentage=$(get_current_percentage "$feature_name")
    log_info "Current rollout percentage: $current_percentage%"
    
    # If already at or above target, no need to rollout
    if [ "$current_percentage" -ge "$target_percentage" ]; then
        log_info "Feature is already at or above target percentage"
        return 0
    fi
    
    # Process each rollout step
    while IFS= read -r step; do
        local step_percentage=$(echo "$step" | awk '{print $1}')
        local step_duration=$(echo "$step" | awk '{print $2}')
        
        # Skip if step percentage is less than current
        if [ "$step_percentage" -le "$current_percentage" ]; then
            continue
        fi
        
        # Don't exceed target percentage
        if [ "$step_percentage" -gt "$target_percentage" ]; then
            step_percentage=$target_percentage
        fi
        
        log_info "Rolling out to $step_percentage% for duration: $step_duration"
        
        # Store previous percentage for potential rollback
        local previous_percentage=$current_percentage
        
        # Update feature flag
        update_feature_flag "$feature_name" "$step_percentage"
        
        # Send notification
        send_rollout_notification "$feature_name" "$step_percentage" "IN_PROGRESS"
        
        # Wait for the step duration
        log_info "Waiting for $step_duration before health check..."
        sleep_duration=$(echo "$step_duration" | sed 's/h/*3600/g; s/m/*60/g; s/s//g' | bc)
        sleep "$sleep_duration"
        
        # Check health metrics
        if ! check_health_metrics "$feature_name" "$step_percentage"; then
            log_error "Health check failed at $step_percentage%, initiating rollback"
            rollback_feature "$feature_name" "$previous_percentage"
            exit 1
        fi
        
        current_percentage=$step_percentage
        
        # If we've reached the target, break
        if [ "$current_percentage" -ge "$target_percentage" ]; then
            break
        fi
        
    done <<< "$steps"
    
    log_success "Gradual rollout completed successfully"
    send_rollout_notification "$feature_name" "$current_percentage" "COMPLETED"
}

# Canary deployment strategy
canary_deployment() {
    local feature_name=$1
    local target_percentage=$2
    
    log_info "Starting canary deployment for feature: $feature_name"
    
    # Get canary configuration
    local canary_percentage=$(jq -r '.rolloutStrategies.canaryDeployment.canaryPercentage' "$FEATURE_FLAGS_FILE")
    local canary_duration=$(jq -r '.rolloutStrategies.canaryDeployment.canaryDuration' "$FEATURE_FLAGS_FILE")
    
    log_info "Canary percentage: $canary_percentage%"
    log_info "Canary duration: $canary_duration"
    
    # Deploy to canary users
    update_feature_flag "$feature_name" "$canary_percentage"
    send_rollout_notification "$feature_name" "$canary_percentage" "CANARY_STARTED"
    
    # Wait for canary duration
    log_info "Monitoring canary deployment for $canary_duration..."
    sleep_duration=$(echo "$canary_duration" | sed 's/h/*3600/g; s/m/*60/g; s/s//g' | bc)
    sleep "$sleep_duration"
    
    # Check canary success criteria
    if ! check_health_metrics "$feature_name" "$canary_percentage"; then
        log_error "Canary deployment failed health checks"
        rollback_feature "$feature_name" 0
        exit 1
    fi
    
    log_success "Canary deployment successful, proceeding with full rollout"
    
    # Proceed with full rollout
    update_feature_flag "$feature_name" "$target_percentage"
    send_rollout_notification "$feature_name" "$target_percentage" "FULL_ROLLOUT"
    
    # Final health check
    sleep 60
    if ! check_health_metrics "$feature_name" "$target_percentage"; then
        log_error "Full rollout failed health checks"
        rollback_feature "$feature_name" "$canary_percentage"
        exit 1
    fi
    
    log_success "Canary deployment completed successfully"
}

# Blue-green deployment strategy
blue_green_deployment() {
    local feature_name=$1
    local target_percentage=$2
    
    log_info "Starting blue-green deployment for feature: $feature_name"
    
    # Get blue-green configuration
    local switch_duration=$(jq -r '.rolloutStrategies.blueGreenDeployment.switchDuration' "$FEATURE_FLAGS_FILE")
    local rollback_threshold=$(jq -r '.rolloutStrategies.blueGreenDeployment.rollbackThreshold' "$FEATURE_FLAGS_FILE")
    
    log_info "Switch duration: $switch_duration"
    log_info "Rollback threshold: $rollback_threshold%"
    
    # Instant switch to target percentage
    local previous_percentage=$(get_current_percentage "$feature_name")
    update_feature_flag "$feature_name" "$target_percentage"
    send_rollout_notification "$feature_name" "$target_percentage" "BLUE_GREEN_SWITCH"
    
    # Wait for switch duration
    log_info "Monitoring blue-green switch for $switch_duration..."
    sleep_duration=$(echo "$switch_duration" | sed 's/h/*3600/g; s/m/*60/g; s/s//g' | bc)
    sleep "$sleep_duration"
    
    # Check if rollback is needed
    if ! check_health_metrics "$feature_name" "$target_percentage"; then
        log_error "Blue-green deployment failed health checks"
        rollback_feature "$feature_name" "$previous_percentage"
        exit 1
    fi
    
    log_success "Blue-green deployment completed successfully"
}

# Monitor rollout progress
monitor_rollout() {
    local feature_name=$1
    
    log_info "Monitoring rollout progress for feature: $feature_name"
    
    while true; do
        local current_percentage=$(get_current_percentage "$feature_name")
        log_info "Current rollout: $current_percentage%"
        
        # Check health metrics
        if ! check_health_metrics "$feature_name" "$current_percentage"; then
            log_warning "Health check failed during monitoring"
        fi
        
        # Check if rollout is complete
        if [ "$current_percentage" -eq 100 ]; then
            log_success "Rollout monitoring complete - feature is at 100%"
            break
        fi
        
        sleep 300  # Check every 5 minutes
    done
}

# Emergency stop function
emergency_stop() {
    local feature_name=$1
    
    log_error "Emergency stop triggered for feature: $feature_name"
    
    # Set rollout to 0%
    update_feature_flag "$feature_name" 0
    send_rollout_notification "$feature_name" 0 "EMERGENCY_STOP"
    
    log_success "Emergency stop completed"
}

# Show help
show_help() {
    cat << EOF
Advanced Notification System - Gradual Rollout Script

Usage: $0 <STRATEGY> <FEATURE_NAME> [TARGET_PERCENTAGE]

Strategies:
  gradualRollout     Gradually increase rollout percentage over time
  canaryDeployment   Deploy to canary users first, then full rollout
  blueGreenDeployment Instant switch with quick rollback capability
  monitor           Monitor existing rollout progress
  emergencyStop     Emergency stop and rollback to 0%

Arguments:
  FEATURE_NAME       Name of the feature flag to rollout
  TARGET_PERCENTAGE  Target rollout percentage (default: 100)

Examples:
  $0 gradualRollout enableSMSNotifications 100
  $0 canaryDeployment enableEmailTracking 50
  $0 blueGreenDeployment enableRealTimeNotifications 100
  $0 monitor enableSMSNotifications
  $0 emergencyStop enableEmailTracking

Environment Variables:
  SLACK_WEBHOOK_URL     Slack webhook for notifications
  NOTIFICATION_EMAIL    Email address for notifications

EOF
}

# Signal handlers for graceful shutdown
trap 'log_error "Rollout interrupted"; exit 1' INT TERM

# Main function
main() {
    if [ $# -lt 2 ]; then
        show_help
        exit 1
    fi
    
    local strategy=$1
    local feature_name=$2
    local target_percentage=${3:-100}
    
    log_info "Starting rollout with strategy: $strategy"
    log_info "Feature: $feature_name"
    log_info "Target: $target_percentage%"
    log_info "Timestamp: $(date)"
    
    # Load feature flags
    load_feature_flags
    
    # Validate feature exists
    if ! jq -e --arg feature "$feature_name" '.featureFlags.notifications[$feature]' "$FEATURE_FLAGS_FILE" > /dev/null; then
        log_error "Feature '$feature_name' not found in feature flags"
        exit 1
    fi
    
    # Execute strategy
    case "$strategy" in
        gradualRollout)
            gradual_rollout "$feature_name" "$target_percentage"
            ;;
        canaryDeployment)
            canary_deployment "$feature_name" "$target_percentage"
            ;;
        blueGreenDeployment)
            blue_green_deployment "$feature_name" "$target_percentage"
            ;;
        monitor)
            monitor_rollout "$feature_name"
            ;;
        emergencyStop)
            emergency_stop "$feature_name"
            ;;
        *)
            log_error "Unknown strategy: $strategy"
            show_help
            exit 1
            ;;
    esac
    
    log_success "Rollout operation completed successfully!"
}

# Command handling
case "${1:-}" in
    help|--help|-h)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac