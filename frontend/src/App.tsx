import { Header } from "./components/layout/Header";
import { PageContainer } from "./components/layout/PageContainer";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ToastContainer } from "./components/ui/Toast";

function App() {
  return (
    <div className="min-h-screen bg-surface-950">
      <Header />
      <PageContainer>
        <Dashboard />
      </PageContainer>
      <ToastContainer />
    </div>
  );
}

export default App;
