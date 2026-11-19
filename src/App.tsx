import { useState } from 'react'
import { FieldMap } from './field-map/FieldMap'
import { ResearchArchaeology } from './research-archaeology/ResearchArchaeology'

function App() {
  const [view, setView] = useState<'archaeology' | 'field-map'>('archaeology')

  return view === 'archaeology' ? (
    <ResearchArchaeology onOpenFieldMap={() => setView('field-map')} />
  ) : (
    <FieldMap onOpenArchaeology={() => setView('archaeology')} />
  )
}

export default App
