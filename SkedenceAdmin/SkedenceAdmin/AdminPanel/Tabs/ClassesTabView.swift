//
//  ClassesTabView.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct ClassesTabView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    private var auth: AuthManager { dependencies.auth }
    @ObservedObject var adminService: AdminService
    @ObservedObject var classesService: ClassesService
    @ObservedObject var trainersService: TrainersService
    
    @Binding var classToEdit: GroupClass?
    @Binding var isCreatingClass: Bool
    
    // Filter to only show upcoming classes in management view
    private var upcomingClasses: [GroupClass] {
        let now = Date()
        return classesService.classes.filter { $0.startTime >= now }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("Manage Classes")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("\(upcomingClasses.count) upcoming classes")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                
                Spacer()
                
                Button {
                    isCreatingClass = true
                } label: {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 16, weight: .semibold))
                        Text("New Class")
                            .font(.bodyMedium)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                            .fill(AppTheme.primary)
                    )
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, Spacing.lg)
            
            // Content
            if classesService.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if upcomingClasses.isEmpty {
                VStack(spacing: Spacing.lg) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 60))
                        .foregroundStyle(AppTheme.textTertiary)
                    
                    VStack(spacing: Spacing.xs) {
                        Text("No Upcoming Classes")
                            .font(.headingMedium)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text("Create your first class to get started")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    
                    Button {
                        isCreatingClass = true
                    } label: {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "plus.circle.fill")
                            Text("Create Class")
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.md)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.sm, style: .continuous)
                                .fill(AppTheme.primary)
                        )
                    }
                    .buttonStyle(.plain)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: Spacing.md) {
                        ForEach(upcomingClasses) { classItem in
                            AdminClassCard(
                                classItem: classItem,
                                onTap: {
                                    classToEdit = classItem
                                },
                                onToggleRegistration: { isOpen in
                                    Task {
                                        guard let classId = classItem.id, let orgId = auth.currentOrgId else { return }
                                        try? await adminService.toggleClassRegistration(classId: classId, isOpen: isOpen)
                                        await classesService.loadAllClasses(orgId: orgId)
                                    }
                                },
                                onDelete: {
                                    Task {
                                        guard let classId = classItem.id, let orgId = auth.currentOrgId else { return }
                                        try? await adminService.deleteClass(classId: classId, orgId: orgId)
                                        await classesService.loadAllClasses(orgId: orgId)
                                    }
                                }
                            )
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.xl)
                }
            }
        }
        .sheet(item: $classToEdit) { classItem in
            EditClassView(
                classItem: classItem,
                adminService: adminService,
                trainersService: trainersService
            ) {
                Task {
                    guard let orgId = auth.currentOrgId else { return }
                    await classesService.loadAllClasses(orgId: orgId)
                }
            }
            .environmentObject(dependencies)
        }
    }
}
