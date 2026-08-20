import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { WorkstationWindow } from '../../src/renderer/src/windows/WorkstationWindow'

it('renders the companion workstation identity', () => {
  render(<WorkstationWindow />)

  expect(
    screen.getByRole('heading', { name: '工友的工位' }),
  ).toBeInTheDocument()
})
