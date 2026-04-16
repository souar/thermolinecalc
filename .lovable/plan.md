
## Move diagrams below all output sections

Reorder the results column in `src/components/CalculatorPanel.tsx`:

**New order:**
1. Warnings alert
2. Top stats (panel count primary)
3. Section cards grid (Walls/Infill, Roof/Apex, Gable walls/triangles)
4. Geometry card
5. **Bay diagram** (moved down)
6. **Gable diagram** (moved down)

Single-file edit — move the `<BayDiagram />` and `<GableDiagram />` JSX from their current position (between top stats and section cards) to after the Geometry card.

### Files
- `src/components/CalculatorPanel.tsx`
