//
//  HourDayCell.swift
//  SkedenceAdmin
//
//  Shared schedule cell component for displaying hour slots with availability
//

import SwiftUI

struct HourDayCell: View {
    let day: Date
    let hour: Int
    let slotsForDay: [TrainerScheduleSlot]
    let dayColumnWidth: CGFloat
    let rowHeight: CGFloat
    let horizontalPadding: CGFloat
    let isToday: Bool
    let viewingTrainerId: String?
    let onEmptyTap: () -> Void
    let onSlotTap: (TrainerScheduleSlot) -> Void
    let onSetStatus: (TrainerScheduleSlot.Status) -> Void
    let onClear: () -> Void

    // Computed values to avoid local lets in body builder
    private var cellStart: Date {
        Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: day) ?? day
    }
    
    private var cellEnd: Date {
        Calendar.current.date(byAdding: .hour, value: 1, to: cellStart) ?? cellStart.addingTimeInterval(3600)
    }
    
    private var matching: [TrainerScheduleSlot] {
        slotsForDay.filter { $0.startTime < cellEnd && $0.endTime > cellStart }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12)
                .fill(isToday ? Color(UIColor.systemGray4) : Color(UIColor.systemGray5))
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(UIColor.systemGray3), lineWidth: 0.5)

            ForEach(matching) { slot in
                EventCell(slot: slot, viewingTrainerId: viewingTrainerId)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        onSlotTap(slot)
                    }
                    .contextMenu {
                        // Only show delete option for open slots
                        if slot.status == .open {
                            Button(role: .destructive) {
                                onClear()
                            } label: {
                                Label("Delete Availability", systemImage: "trash")
                            }
                        }
                    }
            }
        }
        .frame(width: dayColumnWidth, height: rowHeight)
        .padding(.horizontal, horizontalPadding)
        .contentShape(Rectangle())
        .onTapGesture {
            if matching.isEmpty {
                onEmptyTap()
            }
        }
        .contextMenu {
            Button {
                onSetStatus(.open)
            } label: {
                Label("Set Available", systemImage: "checkmark.circle")
            }
            Button(role: .destructive) {
                onSetStatus(.unavailable)
            } label: {
                Label("Set Unavailable", systemImage: "xmark.circle")
            }
            Divider()
            Button(role: .destructive) {
                onClear()
            } label: {
                Label("Clear", systemImage: "trash")
            }
        }
    }
}
