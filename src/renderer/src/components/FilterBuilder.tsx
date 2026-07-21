import { useState } from 'react'
import type { ColumnSpec, Engine, FilterGroup } from '@shared/types'
import { previewWhere } from '@shared/filterCompiler'
import { FilterTreeEditor } from './FilterTreeEditor'
import { useStore } from '../store'

function emptyGroup(): FilterGroup {
  return { kind: 'group', combiner: 'AND', children: [] }
}

/** The advanced visual filter builder (nested AND/OR groups). Modal. */
export function FilterBuilder(props: {
  engine: Engine
  columns: ColumnSpec[]
  onClose: () => void
}): JSX.Element {
  const { engine, columns, onClose } = props
  const at = useStore((s) => s.getActiveTab())
  const setBuilderTree = useStore((s) => s.setBuilderTree)

  const [tree, setTree] = useState<FilterGroup>(
    () => (at?.builderTree ? (JSON.parse(JSON.stringify(at.builderTree)) as FilterGroup) : emptyGroup())
  )

  const preview = previewWhere(engine, at?.filters ?? [], tree)
  const quickCount = at?.filters.length ?? 0

  const apply = (): void => {
    // Empty tree -> clear the builder filter.
    void setBuilderTree(tree.children.length > 0 ? tree : null)
    onClose()
  }
  const clear = (): void => {
    void setBuilderTree(null)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal filter-builder" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Filter builder — nested conditions</div>

        <FilterTreeEditor node={tree} engine={engine} columns={columns} isRoot onChange={(n) => setTree(n as FilterGroup)} />

        <div className="section-title" style={{ marginTop: 10 }}>WHERE preview</div>
        <pre className="ddl-pre">{preview}</pre>
        {quickCount > 0 && (
          <div className="ddl-note">
            ℹ Also AND-combined with {quickCount} active quick filter{quickCount > 1 ? 's' : ''} (effective filter =
            quick filters AND this builder).
          </div>
        )}

        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
          <button onClick={clear}>Clear builder</button>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
