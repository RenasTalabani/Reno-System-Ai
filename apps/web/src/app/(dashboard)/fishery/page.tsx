'use client'
export default function FisheryPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Fishery Management</h1>
      <p className="text-muted-foreground">Manage fishing sites, catches, and aquaculture operations.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Active Sites', 'Today\'s Catches', 'Total Catches'].map((label) => (
          <div key={label} className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-1">—</div>
          </div>
        ))}
      </div>
    </div>
  )
}
