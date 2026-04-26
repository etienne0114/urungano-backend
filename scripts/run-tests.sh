#!/bin/bash

# Backend Test Runner Script
# Runs comprehensive test suite with proper setup and cleanup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DB_NAME="urungano_test_$(date +%s)"
ORIGINAL_DB_NAME=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if PostgreSQL is running
check_postgres() {
    print_status "Checking PostgreSQL connection..."
    
    if ! pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; then
        print_error "PostgreSQL is not running or not accessible"
        print_status "Please ensure PostgreSQL is running on localhost:5432"
        exit 1
    fi
    
    print_success "PostgreSQL is running"
}

# Function to setup test database
setup_test_db() {
    print_status "Setting up test database: $TEST_DB_NAME"
    
    # Create test database
    createdb -h localhost -U postgres "$TEST_DB_NAME" 2>/dev/null || {
        print_warning "Database $TEST_DB_NAME already exists or couldn't be created"
    }
    
    # Update .env.test with unique database name
    if [ -f .env.test ]; then
        ORIGINAL_DB_NAME=$(grep "^DB_NAME=" .env.test | cut -d'=' -f2)
        sed -i.bak "s/^DB_NAME=.*/DB_NAME=$TEST_DB_NAME/" .env.test
        print_success "Updated .env.test with test database name"
    else
        print_error ".env.test file not found"
        exit 1
    fi
}

# Function to cleanup test database
cleanup_test_db() {
    print_status "Cleaning up test database: $TEST_DB_NAME"
    
    # Restore original database name in .env.test
    if [ -n "$ORIGINAL_DB_NAME" ] && [ -f .env.test.bak ]; then
        mv .env.test.bak .env.test
        print_success "Restored original .env.test"
    fi
    
    # Drop test database
    dropdb -h localhost -U postgres "$TEST_DB_NAME" 2>/dev/null || {
        print_warning "Could not drop test database $TEST_DB_NAME"
    }
}

# Function to run linting
run_lint() {
    print_status "Running ESLint..."
    
    if npm run lint; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        return 1
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    if npm run test:unit; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    if npm run test:integration; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run e2e tests
run_e2e_tests() {
    print_status "Running end-to-end tests..."
    
    if npm run test:e2e; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Function to run coverage tests
run_coverage_tests() {
    print_status "Running tests with coverage..."
    
    if npm run test:coverage; then
        print_success "Coverage tests completed"
        
        # Display coverage summary
        if [ -f coverage/lcov-report/index.html ]; then
            print_status "Coverage report generated: coverage/lcov-report/index.html"
        fi
        
        # Check coverage thresholds
        if grep -q "ERROR: Coverage" coverage/lcov-report/index.html 2>/dev/null; then
            print_warning "Coverage thresholds not met"
            return 1
        fi
    else
        print_error "Coverage tests failed"
        return 1
    fi
}

# Function to run security audit
run_security_audit() {
    print_status "Running security audit..."
    
    if npm audit --audit-level=moderate; then
        print_success "Security audit passed"
    else
        print_warning "Security audit found issues"
        # Don't fail the build for audit issues, just warn
    fi
}

# Function to check build
check_build() {
    print_status "Checking build..."
    
    if npm run build; then
        print_success "Build successful"
    else
        print_error "Build failed"
        return 1
    fi
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --unit          Run only unit tests"
    echo "  --integration   Run only integration tests"
    echo "  --e2e           Run only e2e tests"
    echo "  --coverage      Run tests with coverage"
    echo "  --lint          Run only linting"
    echo "  --audit         Run only security audit"
    echo "  --build         Run only build check"
    echo "  --all           Run all tests (default)"
    echo "  --fast          Run tests without coverage"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 --unit            # Run only unit tests"
    echo "  $0 --fast            # Run all tests without coverage"
    echo "  $0 --lint --build    # Run linting and build check"
}

# Main execution function
main() {
    local run_lint_flag=false
    local run_unit_flag=false
    local run_integration_flag=false
    local run_e2e_flag=false
    local run_coverage_flag=false
    local run_audit_flag=false
    local run_build_flag=false
    local run_all_flag=true
    local fast_mode=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit)
                run_unit_flag=true
                run_all_flag=false
                shift
                ;;
            --integration)
                run_integration_flag=true
                run_all_flag=false
                shift
                ;;
            --e2e)
                run_e2e_flag=true
                run_all_flag=false
                shift
                ;;
            --coverage)
                run_coverage_flag=true
                run_all_flag=false
                shift
                ;;
            --lint)
                run_lint_flag=true
                run_all_flag=false
                shift
                ;;
            --audit)
                run_audit_flag=true
                run_all_flag=false
                shift
                ;;
            --build)
                run_build_flag=true
                run_all_flag=false
                shift
                ;;
            --all)
                run_all_flag=true
                shift
                ;;
            --fast)
                fast_mode=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Set up trap for cleanup
    trap cleanup_test_db EXIT
    
    print_status "Starting backend test suite..."
    
    # Check prerequisites
    check_postgres
    
    # Setup test environment
    setup_test_db
    
    # Track test results
    local failed_tests=()
    
    # Run selected tests
    if [ "$run_all_flag" = true ]; then
        print_status "Running complete test suite..."
        
        run_lint || failed_tests+=("lint")
        run_unit_tests || failed_tests+=("unit")
        run_integration_tests || failed_tests+=("integration")
        run_e2e_tests || failed_tests+=("e2e")
        
        if [ "$fast_mode" = false ]; then
            run_coverage_tests || failed_tests+=("coverage")
        fi
        
        run_security_audit || failed_tests+=("audit")
        check_build || failed_tests+=("build")
    else
        # Run individual test types
        [ "$run_lint_flag" = true ] && (run_lint || failed_tests+=("lint"))
        [ "$run_unit_flag" = true ] && (run_unit_tests || failed_tests+=("unit"))
        [ "$run_integration_flag" = true ] && (run_integration_tests || failed_tests+=("integration"))
        [ "$run_e2e_flag" = true ] && (run_e2e_tests || failed_tests+=("e2e"))
        [ "$run_coverage_flag" = true ] && (run_coverage_tests || failed_tests+=("coverage"))
        [ "$run_audit_flag" = true ] && (run_security_audit || failed_tests+=("audit"))
        [ "$run_build_flag" = true ] && (check_build || failed_tests+=("build"))
    fi
    
    # Report results
    echo ""
    print_status "Test suite completed"
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        print_success "All tests passed! ✅"
        exit 0
    else
        print_error "Some tests failed: ${failed_tests[*]}"
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi