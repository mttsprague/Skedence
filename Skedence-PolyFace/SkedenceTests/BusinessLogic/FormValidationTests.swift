//
//  FormValidationTests.swift
//  SkedenceTests
//
//  Phase 7.2: Form validation and data format tests
//

import XCTest
@testable import Skedence

final class FormValidationTests: XCTestCase {
    
    // MARK: - Email Validation Tests
    
    func testEmailValidation_ValidFormats() {
        // Given
        let validEmails = [
            "user@example.com",
            "user.name@example.com",
            "user+tag@example.co.uk",
            "user123@test-domain.com",
            "first.last@company.org"
        ]
        
        // When/Then
        for email in validEmails {
            XCTAssertTrue(isValidEmail(email), "\(email) should be valid")
        }
    }
    
    func testEmailValidation_InvalidFormats() {
        // Given
        let invalidEmails = [
            "",
            "plaintext",
            "@example.com",
            "user@",
            "user name@example.com",
            "user@.com",
            "user@@example.com",
            "user@example",
            "user@example..com"
        ]
        
        // When/Then
        for email in invalidEmails {
            XCTAssertFalse(isValidEmail(email), "\(email) should be invalid")
        }
    }
    
    // MARK: - Phone Number Validation Tests
    
    func testPhoneValidation_ValidFormats() {
        // Given
        let validPhones = [
            "555-1234",
            "(555) 123-4567",
            "555.123.4567",
            "5551234567",
            "+1 555 123 4567",
            "1-555-123-4567"
        ]
        
        // When/Then
        for phone in validPhones {
            let digitsOnly = phone.filter { $0.isNumber }
            XCTAssertTrue(digitsOnly.count >= 7, "\(phone) should have at least 7 digits")
        }
    }
    
    func testPhoneValidation_InvalidFormats() {
        // Given
        let invalidPhones = [
            "",
            "123",
            "abc-defg",
            "12-34-56"
        ]
        
        // When/Then
        for phone in invalidPhones {
            let digitsOnly = phone.filter { $0.isNumber }
            XCTAssertTrue(digitsOnly.count < 7, "\(phone) should have fewer than 7 digits")
        }
    }
    
    func testPhoneValidation_ExtractDigits() {
        // Given
        let formattedPhone = "(555) 123-4567"
        
        // When
        let digitsOnly = formattedPhone.filter { $0.isNumber }
        
        // Then
        XCTAssertEqual(digitsOnly, "5551234567", "Should extract only digits")
        XCTAssertEqual(digitsOnly.count, 10, "US phone should have 10 digits")
    }
    
    // MARK: - Required Field Validation Tests
    
    func testRequiredField_NotEmpty() {
        // Given
        let requiredField = "John"
        
        // When
        let isValid = !requiredField.trimmingCharacters(in: .whitespaces).isEmpty
        
        // Then
        XCTAssertTrue(isValid, "Non-empty field should be valid")
    }
    
    func testRequiredField_Empty() {
        // Given
        let emptyField = ""
        
        // When
        let isValid = !emptyField.trimmingCharacters(in: .whitespaces).isEmpty
        
        // Then
        XCTAssertFalse(isValid, "Empty field should be invalid")
    }
    
    func testRequiredField_WhitespaceOnly() {
        // Given
        let whitespaceField = "   "
        
        // When
        let isValid = !whitespaceField.trimmingCharacters(in: .whitespaces).isEmpty
        
        // Then
        XCTAssertFalse(isValid, "Whitespace-only field should be invalid")
    }
    
    // MARK: - Name Validation Tests
    
    func testNameValidation_ValidNames() {
        // Given
        let validNames = [
            "John",
            "Mary-Jane",
            "O'Brien",
            "Jean-Claude",
            "María García"
        ]
        
        // When/Then
        for name in validNames {
            let isValid = name.count >= 2 && !name.trimmingCharacters(in: .whitespaces).isEmpty
            XCTAssertTrue(isValid, "\(name) should be valid")
        }
    }
    
    func testNameValidation_TooShort() {
        // Given
        let shortName = "J"
        
        // When
        let isValid = shortName.count >= 2
        
        // Then
        XCTAssertFalse(isValid, "Single character name should be invalid")
    }
    
    func testNameValidation_RemovesExtraSpaces() {
        // Given
        let nameWithSpaces = "  John   Doe  "
        
        // When
        let cleaned = nameWithSpaces.trimmingCharacters(in: .whitespaces)
        let singleSpaced = cleaned.split(separator: " ").joined(separator: " ")
        
        // Then
        XCTAssertEqual(singleSpaced, "John Doe", "Should trim and normalize spaces")
    }
    
    // MARK: - Password Validation Tests
    
    func testPasswordValidation_MeetsMinimumLength() {
        // Given
        let validPassword = "SecurePass123"
        let tooShort = "Pass1"
        
        // When
        let minimumLength = 8
        
        // Then
        XCTAssertTrue(validPassword.count >= minimumLength, "Should meet minimum length")
        XCTAssertFalse(tooShort.count >= minimumLength, "Should fail minimum length")
    }
    
    func testPasswordValidation_RequiresNumbers() {
        // Given
        let withNumber = "Password123"
        let withoutNumber = "PasswordABC"
        
        // When
        let hasNumber = { (password: String) -> Bool in
            password.rangeOfCharacter(from: .decimalDigits) != nil
        }
        
        // Then
        XCTAssertTrue(hasNumber(withNumber), "Should contain numbers")
        XCTAssertFalse(hasNumber(withoutNumber), "Should not contain numbers")
    }
    
    func testPasswordValidation_RequiresLetters() {
        // Given
        let withLetters = "Password123"
        let onlyNumbers = "12345678"
        
        // When
        let hasLetters = { (password: String) -> Bool in
            password.rangeOfCharacter(from: .letters) != nil
        }
        
        // Then
        XCTAssertTrue(hasLetters(withLetters), "Should contain letters")
        XCTAssertFalse(hasLetters(onlyNumbers), "Should not contain letters")
    }
    
    // MARK: - Date Format Validation Tests
    
    func testDateValidation_FutureDate() {
        // Given
        let futureDate = Date().addingTimeInterval(86400) // Tomorrow
        
        // When
        let isFuture = futureDate > Date()
        
        // Then
        XCTAssertTrue(isFuture, "Should be in the future")
    }
    
    func testDateValidation_PastDate() {
        // Given
        let pastDate = Date().addingTimeInterval(-86400) // Yesterday
        
        // When
        let isPast = pastDate < Date()
        
        // Then
        XCTAssertTrue(isPast, "Should be in the past")
    }
    
    func testDateValidation_MinimumAge() {
        // Given - User must be at least 13 years old
        let birthDate = Calendar.current.date(byAdding: .year, value: -15, to: Date())!
        let tooYoung = Calendar.current.date(byAdding: .year, value: -10, to: Date())!
        
        // When
        let minimumAge = 13
        let ageFromBirthDate = Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year ?? 0
        let ageFromTooYoung = Calendar.current.dateComponents([.year], from: tooYoung, to: Date()).year ?? 0
        
        // Then
        XCTAssertTrue(ageFromBirthDate >= minimumAge, "15 year old should be valid")
        XCTAssertFalse(ageFromTooYoung >= minimumAge, "10 year old should be invalid")
    }
    
    // MARK: - Reference Code Validation Tests
    
    func testReferenceCode_ValidFormat() {
        // Given - Reference codes are typically alphanumeric, 6-8 characters
        let validCodes = [
            "ABC123",
            "XYZ789",
            "TEST01"
        ]
        
        // When/Then
        for code in validCodes {
            let isValid = code.count >= 6 && code.count <= 8 && code.allSatisfy { $0.isLetter || $0.isNumber }
            XCTAssertTrue(isValid, "\(code) should be valid reference code")
        }
    }
    
    func testReferenceCode_InvalidFormat() {
        // Given
        let invalidCodes = [
            "ABC",           // Too short
            "ABC123456",     // Too long
            "ABC-123",       // Contains hyphen
            "abc 123"        // Contains space
        ]
        
        // When/Then
        for code in invalidCodes {
            let isValid = code.count >= 6 && code.count <= 8 && code.allSatisfy { $0.isLetter || $0.isNumber }
            XCTAssertFalse(isValid, "\(code) should be invalid reference code")
        }
    }
    
    // MARK: - Numeric Input Validation Tests
    
    func testNumericInput_PositiveInteger() {
        // Given
        let validInput = "25"
        let invalidInput = "-5"
        
        // When
        let validNumber = Int(validInput)
        let invalidNumber = Int(invalidInput)
        
        // Then
        XCTAssertNotNil(validNumber, "Should parse valid number")
        XCTAssertTrue(validNumber! > 0, "Should be positive")
        XCTAssertTrue((invalidNumber ?? 0) < 0, "Should be negative")
    }
    
    func testNumericInput_DecimalValidation() {
        // Given
        let priceInput = "19.99"
        
        // When
        let price = Double(priceInput)
        
        // Then
        XCTAssertNotNil(price, "Should parse decimal")
        XCTAssertEqual(price, 19.99, accuracy: 0.001, "Should preserve decimal precision")
    }
    
    func testNumericInput_Range() {
        // Given - Class capacity between 1 and 50
        let validCapacity = 15
        let tooLow = 0
        let tooHigh = 100
        
        // When
        let minimumCapacity = 1
        let maximumCapacity = 50
        
        // Then
        XCTAssertTrue(validCapacity >= minimumCapacity && validCapacity <= maximumCapacity, "Should be in valid range")
        XCTAssertFalse(tooLow >= minimumCapacity, "Should be below minimum")
        XCTAssertFalse(tooHigh <= maximumCapacity, "Should be above maximum")
    }
    
    // MARK: - Helper Methods
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}
