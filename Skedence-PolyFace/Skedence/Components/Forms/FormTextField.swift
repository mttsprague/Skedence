//
//  FormTextField.swift
//  Skedence
//
//  Phase 5.1: Standardized text field component for forms
//

import SwiftUI

/// A standardized text field with icon and consistent styling
struct FormTextField: View {
    let placeholder: String
    @Binding var text: String
    let icon: String?
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    
    init(
        placeholder: String,
        text: Binding<String>,
        icon: String? = nil,
        keyboardType: UIKeyboardType = .default,
        autocapitalization: TextInputAutocapitalization = .sentences
    ) {
        self.placeholder = placeholder
        self._text = text
        self.icon = icon
        self.keyboardType = keyboardType
        self.autocapitalization = autocapitalization
    }
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(width: 20)
            }
            
            TextField(placeholder, text: $text)
                .font(.bodyMedium)
                .keyboardType(keyboardType)
                .textInputAutocapitalization(autocapitalization)
        }
        .padding(Spacing.md)
        .background(Color(UIColor.systemGray6))
        .cornerRadius(CornerRadius.sm)
    }
}

/// A multi-line text editor field with consistent styling
struct FormTextEditor: View {
    let placeholder: String
    @Binding var text: String
    let icon: String?
    var minHeight: CGFloat = 100
    
    init(
        placeholder: String,
        text: Binding<String>,
        icon: String? = nil,
        minHeight: CGFloat = 100
    ) {
        self.placeholder = placeholder
        self._text = text
        self.icon = icon
        self.minHeight = minHeight
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(width: 20)
                    .padding(.top, Spacing.xs)
            }
            
            ZStack(alignment: .topLeading) {
                if text.isEmpty {
                    Text(placeholder)
                        .foregroundStyle(AppTheme.textTertiary)
                        .font(.bodyMedium)
                        .padding(.vertical, 8)
                }
                
                TextEditor(text: $text)
                    .font(.bodyMedium)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: minHeight)
            }
        }
        .padding(Spacing.md)
        .background(Color(UIColor.systemGray6))
        .cornerRadius(CornerRadius.sm)
    }
}
