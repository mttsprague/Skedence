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

    var body: some View {
        VStack(spacing: 2) {
            Text(slot.displayTitle)
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
