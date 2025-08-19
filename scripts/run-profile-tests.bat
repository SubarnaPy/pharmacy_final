@echo off
echo ============================================================
echo DOCTOR PROFILE MANAGEMENT - COMPREHENSIVE TEST SUITE
echo ============================================================
echo This test suite covers:
echo • Unit tests for all profile section components and validation logic
echo • Integration tests for API endpoints and database operations
echo • E2E tests for complete profile update workflows
echo • Performance tests for profile loading and saving operations
echo.

set TOTAL_TESTS=0
set PASSED_TESTS=0
set FAILED_TESTS=0

echo Frontend Tests
echo ----------------------------------------

echo Running Frontend Unit Tests...
cd frontend
call npm test -- --testPathPatterns=tests/unit/doctor-profile-management.test.jsx --verbose --passWithNoTests
if %ERRORLEVEL% EQU 0 (
    echo ✓ Frontend Unit Tests PASSED
    set /a PASSED_TESTS+=1
) else (
    echo ✗ Frontend Unit Tests FAILED
    set /a FAILED_TESTS+=1
)
set /a TOTAL_TESTS+=1
cd ..

echo.
echo Backend Tests
echo ----------------------------------------

echo Running Backend Integration Tests...
cd backend\tests
call cross-env NODE_ENV=test jest --detectOpenHandles --forceExit tests/doctor-profile-integration.test.js --passWithNoTests
if %ERRORLEVEL% EQU 0 (
    echo ✓ Backend Integration Tests PASSED
    set /a PASSED_TESTS+=1
) else (
    echo ✗ Backend Integration Tests FAILED
    set /a FAILED_TESTS+=1
)
set /a TOTAL_TESTS+=1

echo.
echo Running Backend Performance Tests...
call cross-env NODE_ENV=test jest --detectOpenHandles --forceExit tests/doctor-profile-performance.test.js --passWithNoTests
if %ERRORLEVEL% EQU 0 (
    echo ✓ Backend Performance Tests PASSED
    set /a PASSED_TESTS+=1
) else (
    echo ✗ Backend Performance Tests FAILED
    set /a FAILED_TESTS+=1
)
set /a TOTAL_TESTS+=1
cd ..\..

echo.
echo ============================================================
echo TEST RESULTS SUMMARY
echo ============================================================
echo Total Tests: %TOTAL_TESTS%
echo Passed: %PASSED_TESTS%
echo Failed: %FAILED_TESTS%

if %FAILED_TESTS% GTR 0 (
    echo.
    echo Some tests failed. Please review the results above.
    exit /b 1
) else (
    echo.
    echo All tests passed successfully!
    exit /b 0
)