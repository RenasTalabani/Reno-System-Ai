'use client'
export default function DentalPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dental Practice</h1>
      <p className="text-muted-foreground">Manage patients, appointments, and dental procedures.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Active Patients', 'Today\'s Appointments', 'Pending'].map((label) => (
          <div key={label} className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-1">—</div>
          </div>
        ))}
      </div>
    </div>
  )
}
