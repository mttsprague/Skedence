//
//  FormDatePicker.swift
//  Skedence
//
//  Phase 5.1: Standardized date picker component for forms
//

import SwiftUI

/// A standardized date picker with icon and consistent styling
struct FormDatePicker: View {
    let title: String
    @Binding var selection: Date
    let icon: String?
    var displayedComponents: DatePickerComponents = [.date, .hourAndMinute]
    var range: ClosedRange<Date>?
    
    init(
        title: String,
        selection: Binding<Date>,
        icon: String? = nil,
        displayedComponents: DatePickerComponents = [.date, .hourAndMinute],
        range: ClosedRange<Date>? = nil
    ) {
        self.title = title
        self._selection = selection
        self.icon = icon
        self.displayedComponents = displayedComponents
        self.range = range
    }
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(width: 20)
            }
            
            if let range = range {
                DatePicker(
                    title,
                    selection: $selection,
                    in: range,
                    displayedComponents: displayedComponents
                )
                .font(.bodyMedium)
            } else {
                DatePicker(
                    title,
                    selection: $selection,
                    displayedComponents: displayedComponents
                )
                .font(.bodyMedium)
            }
        }
        .padding(Spacing.md)
        .background(Color(UIColor.systemGray6))
        .cornerRadius(CornerRadius.sm)
    }
}
