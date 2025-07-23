#!/bin/bash

# Mind Map Test Runner
# This script runs all Playwright tests for the improved Mind Map application

echo "🧠 Running Mind Map Tests"
echo "========================="
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
echo "Starting Mind Map Test Suite..."
echo ""

# Track overall success
overall_success=true

# Run improved application tests
if ! run_test "tests/mind-map-improved.spec.js" "Improved Mind Map Application Tests"; then
    overall_success=false
fi

# Run validation system tests
if ! run_test "tests/validation.spec.js" "Validation System Tests"; then
    overall_success=false
fi

# Run legacy compatibility tests if they exist
if [ -f "tests/basic-test.spec.js" ]; then
    if ! run_test "tests/basic-test.spec.js" "Legacy Compatibility Tests"; then
        overall_success=false
    fi
fi

# Summary
echo "========================="
echo "🏁 Test Suite Complete"
echo ""

if [ "$overall_success" = true ]; then
    echo "✅ All tests PASSED successfully!"
    echo ""
    echo "🎉 Your Mind Map improvements are working correctly:"
    echo "   ✓ Modular architecture implemented"
    echo "   ✓ Validation system functional"
    echo "   ✓ Helper utilities working"
    echo "   ✓ Database manager operational"
    echo "   ✓ Node management improved"
    echo "   ✓ Error handling enhanced"
    echo "   ✓ Performance optimizations active"
    echo ""
    echo "🚀 Ready for production use!"
else
    echo "❌ Some tests FAILED"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Check the test output above for specific failures"
    echo "   2. Review the improved code modules for any issues"
    echo "   3. Fix any module loading or compatibility problems"
    echo "   4. Re-run tests: npm test"
    echo "   5. For detailed debugging: npm run test:debug"
fi

echo ""
echo "📚 Available test commands:"
echo "   npm test          - Run all tests"
echo "   npm run test:headed - Run tests with browser UI"
echo "   npm run test:debug  - Debug tests step by step"
echo "   npm run test:ui     - Interactive test UI"
echo ""
echo "🔧 Code improvements implemented:"
echo "   📁 config.js - Centralized configuration"
echo "   🛠️  utils/validators.js - Input validation system"
echo "   🔨 utils/helpers.js - Utility functions"
echo "   💾 managers/database-manager.js - Database abstraction"
echo "   🎯 managers/node-manager.js - Node management"
echo "   📱 app-improved.js - Refactored main application"

exit $( [ "$overall_success" = true ] && echo 0 || echo 1 )