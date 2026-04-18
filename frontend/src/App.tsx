import { ConnectButton } from './components/ConnectButton'
import './App.css'

function App() {
  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>GhostPay</h1>
        <ConnectButton />
      </header>
      <main style={{ padding: '24px' }}>
        <p>Private by Design Payroll for Web3</p>
      </main>
    </>
  )
}

export default App
