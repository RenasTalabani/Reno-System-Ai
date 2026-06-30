'use client'
export default function ArchitecturePage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Architecture & Design</h1>
      <p className="text-muted-foreground">Manage design projects, milestones, and client deliverables.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Active Projects', 'Total Projects', 'Pending Milestones'].map((label) => (
          <div key={label} className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-1">—</div>
          </div>
        ))}
      </div>
    </div>
  )
}
