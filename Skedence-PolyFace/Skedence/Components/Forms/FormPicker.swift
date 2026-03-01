//
//  FormPicker.swift
//  Skedence
//
//  Phase 5.1: Standardized picker component for forms
//

import SwiftUI

/// A standardized picker with icon and consistent styling
struct FormPicker<SelectionValue: Hashable>: View {
    let title: String
    @Binding var selection: SelectionValue
    let icon: String?
    let content: () -> Any
    
    init(
        title: String,
        selection: Binding<SelectionValue>,
        icon: String? = nil,
        @ViewBuilder content: @escaping () -> Any
    ) {
        self.title = title
        self._selection = selection
        self.icon = icon
        self.content = content
    }
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(width: 20)
            }
            
            // Using Menu instead of Picker for better styling control
            Menu {
                // Content goes here - provided by caller
            } label: {
                HStack {
                    Text(title)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.textTertiary)
                }
            }
        }
        .padding(Spacing.md)
        .background(Color(UIColor.systemGray6))
        .cornerRadius(CornerRadius.sm)
    }
}

/// A standardized section with label for form groups
struct FormSection<Content: View>: View {
    let title: String
    let icon: String?
    let content: Content
    
    init(
        title: String,
        icon: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.icon = icon
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Section header
            HStack(spacing: Spacing.xs) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundStyle(AppTheme.primary)
                }
                
                Text(title)
                    .font(.headingSmall)
                    .foregroundStyle(AppTheme.textPrimary)
            }
            
            // Section content
            content
        }
    }
}
