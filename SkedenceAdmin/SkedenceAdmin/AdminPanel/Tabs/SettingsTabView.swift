//
//  SettingsTabView.swift
//  SkedenceAdmin
//
//  Created by refactoring from AdminPanelView
//  Phase 1.1: AdminPanelView decomposition
//

import SwiftUI

struct SettingsTabView: View {
    @EnvironmentObject private var dependencies: AdminAppDependencies
    
    var body: some View {
        SettingsView()
            .environmentObject(dependencies)
    }
}
