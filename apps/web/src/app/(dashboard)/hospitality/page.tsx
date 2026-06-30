'use client'
export default function HospitalityPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Hospitality Management</h1>
      <p className="text-muted-foreground">Manage hotel properties, rooms, and reservations.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Total Rooms', 'Occupied Rooms', 'Upcoming Check-ins'].map((label) => (
          <div key={label} className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-1">—</div>
          </div>
        ))}
      </div>
    </div>
  )
}
