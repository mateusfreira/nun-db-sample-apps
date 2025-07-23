#!/bin/bash

# Live Comment Feed Test Runner
# This script runs all Playwright tests for the Live Comment Feed component

echo "🧪 Running Live Comment Feed Tests"
echo "=================================="
echo ""

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Playwright not found. Installing dependencies..."
    npm install
    
    # Install Playwright browsers if needed
    if ! npx playwright install --help &> /dev/null; then
        echo "📥 Installing Playwright browsers..."
        npx playwright install
    fi
fi

echo "🔍 Test Environment:"
echo "   Node.js: $(node --version)"
echo "   NPM: $(npm --version)"
echo "   Current Directory: $(pwd)"
echo ""

# Function to run specific test file
run_test() {
    local test_file="$1"
    local description="$2"
    
    echo "🏃 Running: $description"
    echo "   File: $test_file"
    echo ""
    
    npx playwright test "$test_file" --reporter=list
    
    if [ $? -eq 0 ]; then
        echo "✅ $description - PASSED"
    else
        echo "❌ $description - FAILED"
        return 1
    fi
    echo ""
}

# Main test execution
echo "Starting Live Comment Feed Test Suite..."
echo ""

# Track overall success
overall_success=true

# Run core functionality tests
if ! run_test "live-comment-feed.spec.js" "Core Functionality Tests"; then
    overall_success=false
fi

# Run multi-user real-time tests
if ! run_test "multi-user-realtime.spec.js" "Multi-User Real-Time Tests"; then
    overall_success=false
fi

# Summary
echo "=================================="
echo "🏁 Test Suite Complete"
echo ""

if [ "$overall_success" = true ]; then
    echo "✅ All tests PASSED successfully!"
    echo ""
    echo "🎉 Your Live Comment Feed is working correctly:"
    echo "   ✓ NunDB connection and feed joining"
    echo "   ✓ Comment posting and form validation"
    echo "   ✓ Admin mode and moderation features" 
    echo "   ✓ Real-time synchronization"
    echo "   ✓ Multi-user collaboration"
    echo "   ✓ Responsive design"
    echo "   ✓ Error handling"
    echo ""
    echo "🚀 Ready for production use!"
else
    echo "❌ Some tests FAILED"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Check the test output above for specific failures"
    echo "   2. Fix any issues in the application code"
    echo "   3. Re-run tests: npm test"
    echo "   4. For detailed debugging: npm run test:debug"
fi

echo ""
echo "📚 Available test commands:"
echo "   npm test          - Run all tests"
echo "   npm run test:headed - Run tests with browser UI"
echo "   npm run test:debug  - Debug tests step by step"
echo "   npm run test:ui     - Interactive test UI"

exit $( [ "$overall_success" = true ] && echo 0 || echo 1 )