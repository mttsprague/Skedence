import Foundation
import EventKit

struct CalendarInvite {
    let title: String
    let startDate: Date
    let endDate: Date
    let location: String?
    let notes: String?
    let organizerName: String?
    let organizerEmail: String?
    
    /// Generate .ics file content for calendar invite
    func generateICS() -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
        dateFormatter.timeZone = TimeZone(identifier: "UTC")
        
        let startDateString = dateFormatter.string(from: startDate)
        let endDateString = dateFormatter.string(from: endDate)
        let now = dateFormatter.string(from: Date())
        
        // Generate unique UID
        let uid = UUID().uuidString
        
        var icsContent = """
        BEGIN:VCALENDAR
        VERSION:2.0
        PRODID:-//Skedence//Booking System//EN
        CALSCALE:GREGORIAN
        METHOD:REQUEST
        BEGIN:VEVENT
        DTSTART:\(startDateString)
        DTEND:\(endDateString)
        DTSTAMP:\(now)
        UID:\(uid)
        SUMMARY:\(escapeICSText(title))
        """
        
        if let location = location {
            icsContent += "\nLOCATION:\(escapeICSText(location))"
        }
        
        if let notes = notes {
            icsContent += "\nDESCRIPTION:\(escapeICSText(notes))"
        }
        
        if let organizerEmail = organizerEmail {
            let name = organizerName ?? ""
            icsContent += "\nORGANIZER;CN=\(escapeICSText(name)):mailto:\(organizerEmail)"
        }
        
        icsContent += """
        
        STATUS:CONFIRMED
        SEQUENCE:0
        BEGIN:VALARM
        TRIGGER:-PT24H
        ACTION:DISPLAY
        DESCRIPTION:Reminder: \(escapeICSText(title))
        END:VALARM
        END:VEVENT
        END:VCALENDAR
        """
        
        return icsContent
    }
    
    /// Generate Google Calendar add URL
    func googleCalendarURL() -> URL? {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
        dateFormatter.timeZone = TimeZone(identifier: "UTC")
        
        let startDateString = dateFormatter.string(from: startDate)
        let endDateString = dateFormatter.string(from: endDate)
        
        var components = URLComponents(string: "https://calendar.google.com/calendar/render")
        components?.queryItems = [
            URLQueryItem(name: "action", value: "TEMPLATE"),
            URLQueryItem(name: "text", value: title),
            URLQueryItem(name: "dates", value: "\(startDateString)/\(endDateString)"),
        ]
        
        if let location = location {
            components?.queryItems?.append(URLQueryItem(name: "location", value: location))
        }
        
        if let notes = notes {
            components?.queryItems?.append(URLQueryItem(name: "details", value: notes))
        }
        
        return components?.url
    }
    
    private func escapeICSText(_ text: String) -> String {
        return text
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: ",", with: "\\,")
            .replacingOccurrences(of: ";", with: "\\;")
            .replacingOccurrences(of: "\n", with: "\\n")
    }
}

extension Booking {
    func generateCalendarInvite(trainerName: String, trainerEmail: String) -> CalendarInvite {
        let endDate = startTime.addingTimeInterval(TimeInterval(durationMinutes * 60))
        
        var notes = "Training session with \(trainerName)"
        if let packageName = lessonPackage {
            notes += "\nPackage: \(packageName)"
        }
        
        return CalendarInvite(
            title: "Training Session: \(lessonPackage ?? "Lesson")",
            startDate: startTime,
            endDate: endDate,
            location: location,
            notes: notes,
            organizerName: trainerName,
            organizerEmail: trainerEmail
        )
    }
}
