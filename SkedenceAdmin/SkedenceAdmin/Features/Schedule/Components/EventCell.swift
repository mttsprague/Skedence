//
//  EventCell.swift
//  SkedenceAdmin
//
//  Shared component for displaying a schedule event/slot
//

import SwiftUI

struct EventCell: View {
    let slot: TrainerScheduleSlot
    let viewingTrainerId: String?
    var viewModel: ScheduleViewModel? = nil // Optional: for class title lookup

    var displayText: String {
        // If this is a class, try to get title from cache first
        if slot.isClass, let classId = slot.classId, let vm = viewModel {
            if let cachedTitle = vm.classTitlesByClassId[classId] {
                return cachedTitle
            }
        }
        // Fall back to slot's displayTitle
        return slot.displayTitle
    }

    var body: some View {
        VStack(spacing: 2) {
            Text(displayText)
                .font(.caption2.weight(.medium))
                .foregroundStyle(.white)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(slot.visualColor(viewingTrainerId: viewingTrainerId))
        )
    }
}
