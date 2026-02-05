//
//  LoadingStateTests.swift
//  SkedenceTests
//
//  Phase 7: Unit tests for Phase 6 LoadingState infrastructure
//

import XCTest
@testable import Skedence

final class LoadingStateTests: XCTestCase {
    
    // MARK: - State Property Tests
    
    func testIsLoading_ReturnsTrue_WhenLoading() {
        // Given
        let state = LoadingState<String>.loading
        
        // Then
        XCTAssertTrue(state.isLoading, "isLoading should be true for loading state")
    }
    
    func testIsLoading_ReturnsFalse_ForOtherStates() {
        // Given
        let idleState = LoadingState<String>.idle
        let successState = LoadingState<String>.success("data")
        let failureState = LoadingState<String>.failure(NSError(domain: "Test", code: 1))
        
        // Then
        XCTAssertFalse(idleState.isLoading, "isLoading should be false for idle")
        XCTAssertFalse(successState.isLoading, "isLoading should be false for success")
        XCTAssertFalse(failureState.isLoading, "isLoading should be false for failure")
    }
    
    func testData_ReturnsValue_WhenSuccess() {
        // Given
        let testData = "Test Data"
        let state = LoadingState<String>.success(testData)
        
        // Then
        XCTAssertEqual(state.data, testData, "data should return the success value")
    }
    
    func testData_ReturnsNil_ForOtherStates() {
        // Given
        let idleState = LoadingState<String>.idle
        let loadingState = LoadingState<String>.loading
        let failureState = LoadingState<String>.failure(NSError(domain: "Test", code: 1))
        
        // Then
        XCTAssertNil(idleState.data, "data should be nil for idle")
        XCTAssertNil(loadingState.data, "data should be nil for loading")
        XCTAssertNil(failureState.data, "data should be nil for failure")
    }
    
    func testError_ReturnsError_WhenFailure() {
        // Given
        let testError = NSError(domain: "TestDomain", code: 42, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        let state = LoadingState<String>.failure(testError)
        
        // Then
        XCTAssertNotNil(state.error, "error should not be nil for failure state")
        XCTAssertEqual((state.error as NSError?)?.code, 42, "error should match the failure error")
    }
    
    func testError_ReturnsNil_ForOtherStates() {
        // Given
        let idleState = LoadingState<String>.idle
        let loadingState = LoadingState<String>.loading
        let successState = LoadingState<String>.success("data")
        
        // Then
        XCTAssertNil(idleState.error, "error should be nil for idle")
        XCTAssertNil(loadingState.error, "error should be nil for loading")
        XCTAssertNil(successState.error, "error should be nil for success")
    }
    
    // MARK: - Equatable Tests
    
    func testEquatable_IdleStates() {
        // Given
        let state1 = LoadingState<String>.idle
        let state2 = LoadingState<String>.idle
        
        // Then
        XCTAssertEqual(state1, state2, "Two idle states should be equal")
    }
    
    func testEquatable_LoadingStates() {
        // Given
        let state1 = LoadingState<String>.loading
        let state2 = LoadingState<String>.loading
        
        // Then
        XCTAssertEqual(state1, state2, "Two loading states should be equal")
    }
    
    func testEquatable_SuccessStates_SameData() {
        // Given
        let state1 = LoadingState<String>.success("test")
        let state2 = LoadingState<String>.success("test")
        
        // Then
        XCTAssertEqual(state1, state2, "Success states with same data should be equal")
    }
    
    func testEquatable_SuccessStates_DifferentData() {
        // Given
        let state1 = LoadingState<String>.success("test1")
        let state2 = LoadingState<String>.success("test2")
        
        // Then
        XCTAssertNotEqual(state1, state2, "Success states with different data should not be equal")
    }
    
    func testEquatable_FailureStates_SameError() {
        // Given
        let error = NSError(domain: "Test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Error"])
        let state1 = LoadingState<String>.failure(error)
        let state2 = LoadingState<String>.failure(error)
        
        // Then
        XCTAssertEqual(state1, state2, "Failure states with same error should be equal")
    }
    
    func testEquatable_DifferentStates() {
        // Given
        let idleState = LoadingState<String>.idle
        let loadingState = LoadingState<String>.loading
        let successState = LoadingState<String>.success("data")
        let failureState = LoadingState<String>.failure(NSError(domain: "Test", code: 1))
        
        // Then
        XCTAssertNotEqual(idleState, loadingState, "Idle and loading should not be equal")
        XCTAssertNotEqual(idleState, successState, "Idle and success should not be equal")
        XCTAssertNotEqual(idleState, failureState, "Idle and failure should not be equal")
        XCTAssertNotEqual(loadingState, successState, "Loading and success should not be equal")
        XCTAssertNotEqual(loadingState, failureState, "Loading and failure should not be equal")
        XCTAssertNotEqual(successState, failureState, "Success and failure should not be equal")
    }
    
    // MARK: - Array LoadingState Tests
    
    func testLoadingState_WithArray() {
        // Given
        let items = ["item1", "item2", "item3"]
        let state = LoadingState<[String]>.success(items)
        
        // Then
        XCTAssertEqual(state.data?.count, 3, "Should store array data")
        XCTAssertEqual(state.data?.first, "item1", "Should preserve array order")
    }
    
    func testLoadingState_WithEmptyArray() {
        // Given
        let emptyArray: [String] = []
        let state = LoadingState<[String]>.success(emptyArray)
        
        // Then
        XCTAssertNotNil(state.data, "Should not be nil for empty array")
        XCTAssertTrue(state.data?.isEmpty ?? false, "Should be empty array")
    }
    
    // MARK: - Complex Type Tests
    
    func testLoadingState_WithComplexType() {
        // Given
        struct TestModel: Equatable {
            let id: String
            let name: String
        }
        
        let model = TestModel(id: "123", name: "Test")
        let state = LoadingState<TestModel>.success(model)
        
        // Then
        XCTAssertEqual(state.data?.id, "123", "Should store complex type data")
        XCTAssertEqual(state.data?.name, "Test", "Should preserve all properties")
    }
}
