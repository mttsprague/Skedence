//
//  DynamicIntakeFormView.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import SwiftUI

struct DynamicIntakeFormView: View {
    @ObservedObject var formData: IntakeFormData
    let fields: [IntakeFormField]
    
    var body: some View {
        VStack(spacing: 0) {
            // Group fields by section
            let athleteFields = fields.filter { $0.section == .athlete }.sorted { $0.order < $1.order }
            let parentFields = fields.filter { $0.section == .parent }.sorted { $0.order < $1.order }
            let emergencyFields = fields.filter { $0.section == .emergency }.sorted { $0.order < $1.order }
            let otherFields = fields.filter { $0.section == .other }.sorted { $0.order < $1.order }
            
            if !athleteFields.isEmpty {
                SectionHeader(title: "Athlete Information")
                ForEach(athleteFields) { field in
                    DynamicFieldRow(field: field, formData: formData)
                }
            }
            
            if !parentFields.isEmpty {
                SectionHeader(title: "Parent / Guardian")
                ForEach(parentFields) { field in
                    DynamicFieldRow(field: field, formData: formData)
                }
            }
            
            if !emergencyFields.isEmpty {
                SectionHeader(title: "Emergency Contact")
                ForEach(emergencyFields) { field in
                    DynamicFieldRow(field: field, formData: formData)
                }
            }
            
            if !otherFields.isEmpty {
                SectionHeader(title: "Additional Information")
                ForEach(otherFields) { field in
                    DynamicFieldRow(field: field, formData: formData)
                }
            }
        }
    }
}

struct SectionHeader: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.headline)
                .foregroundColor(Brand.primary)
            Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 8)
    }
}

struct DynamicFieldRow: View {
    let field: IntakeFormField
    @ObservedObject var formData: IntakeFormData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(field.label)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                if field.required {
                    Text("*")
                        .foregroundColor(.red)
                }
            }
            
            switch field.fieldType {
            case .text, .email:
                TextField(field.placeholder ?? "", text: Binding(
                    get: { formData.getStringValue(forField: field.id) },
                    set: { formData.setValue($0, forField: field.id) }
                ))
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .keyboardType(field.fieldType == .email ? .emailAddress : .default)
                .autocapitalization(field.fieldType == .email ? .none : .words)
                
            case .phone:
                TextField(field.placeholder ?? "", text: Binding(
                    get: { formData.getStringValue(forField: field.id) },
                    set: { formData.setValue($0, forField: field.id) }
                ))
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .keyboardType(.phonePad)
                
            case .number:
                TextField(field.placeholder ?? "", text: Binding(
                    get: { formData.getStringValue(forField: field.id) },
                    set: { formData.setValue($0, forField: field.id) }
                ))
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .keyboardType(.numberPad)
                
            case .date:
                DatePicker(
                    "",
                    selection: Binding(
                        get: { formData.getDateValue(forField: field.id) ?? Date() },
                        set: { formData.setValue($0, forField: field.id) }
                    ),
                    displayedComponents: .date
                )
                .datePickerStyle(.compact)
                .labelsHidden()
                .frame(maxWidth: .infinity)
                
            case .select:
                if let options = field.options {
                    HStack {
                        Picker("", selection: Binding(
                            get: { formData.getStringValue(forField: field.id) },
                            set: { formData.setValue($0, forField: field.id) }
                        )) {
                            Text("Select...").tag("")
                            ForEach(options, id: \.self) { option in
                                Text(option).tag(option)
                            }
                        }
                        .pickerStyle(.menu)
                        .labelsHidden()
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                
            case .textarea:
                ZStack(alignment: .topLeading) {
                    if formData.getStringValue(forField: field.id).isEmpty {
                        Text(field.placeholder ?? "")
                            .foregroundColor(.gray.opacity(0.5))
                            .padding(.top, 8)
                            .padding(.leading, 5)
                    }
                    TextEditor(text: Binding(
                        get: { formData.getStringValue(forField: field.id) },
                        set: { formData.setValue($0, forField: field.id) }
                    ))
                    .frame(minHeight: 80)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}

// Edit Profile version with Form fields
struct DynamicIntakeFormSection: View {
    @ObservedObject var formData: IntakeFormData
    let fields: [IntakeFormField]
    let sectionType: IntakeFormField.Section
    let sectionTitle: String
    
    var body: some View {
        let sectionFields = fields.filter { $0.section == sectionType }.sorted { $0.order < $1.order }
        
        if !sectionFields.isEmpty {
            Section(header: Text(sectionTitle)) {
                ForEach(sectionFields) { field in
                    DynamicFormField(field: field, formData: formData)
                }
            }
        }
    }
}

struct DynamicFormField: View {
    let field: IntakeFormField
    @ObservedObject var formData: IntakeFormData
    
    var body: some View {
        switch field.fieldType {
        case .text, .email:
            TextField(field.label + (field.required ? " *" : ""), text: Binding(
                get: { formData.getStringValue(forField: field.id) },
                set: { formData.setValue($0, forField: field.id) }
            ))
            .keyboardType(field.fieldType == .email ? .emailAddress : .default)
            .autocapitalization(field.fieldType == .email ? .none : .words)
            
        case .phone:
            TextField(field.label + (field.required ? " *" : ""), text: Binding(
                get: { formData.getStringValue(forField: field.id) },
                set: { formData.setValue($0, forField: field.id) }
            ))
            .keyboardType(.phonePad)
            
        case .number:
            TextField(field.label + (field.required ? " *" : ""), text: Binding(
                get: { formData.getStringValue(forField: field.id) },
                set: { formData.setValue($0, forField: field.id) }
            ))
            .keyboardType(.numberPad)
            
        case .date:
            DatePicker(
                field.label + (field.required ? " *" : ""),
                selection: Binding(
                    get: { formData.getDateValue(forField: field.id) ?? Date() },
                    set: { formData.setValue($0, forField: field.id) }
                ),
                displayedComponents: .date
            )
            
        case .select:
            if let options = field.options {
                Picker(field.label + (field.required ? " *" : ""), selection: Binding(
                    get: { formData.getStringValue(forField: field.id) },
                    set: { formData.setValue($0, forField: field.id) }
                )) {
                    Text("Select...").tag("")
                    ForEach(options, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
                .pickerStyle(.menu)
            }
            
        case .textarea:
            ZStack(alignment: .topLeading) {
                if formData.getStringValue(forField: field.id).isEmpty {
                    Text(field.placeholder ?? field.label)
                        .foregroundColor(.gray.opacity(0.5))
                        .padding(.top, 8)
                        .padding(.leading, 5)
                }
                TextEditor(text: Binding(
                    get: { formData.getStringValue(forField: field.id) },
                    set: { formData.setValue($0, forField: field.id) }
                ))
                .frame(minHeight: 100)
            }
        }
    }
}
