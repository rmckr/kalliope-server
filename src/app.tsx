import React, { Fragment, lazy, PropsWithChildren, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { Slide, ToastContainer } from 'react-toastify'
import { SkeletonTheme } from 'react-loading-skeleton'
import WebsocketProvider from './contexts/websocketContext'
import DiscordUserProvider from './contexts/discordUserContext'
import Navbar from './components/Navbar/navbar'
import Header from './components/Header/header'
import Home from './components/Home/home'
import DashboardFrame from './components/Dashboard/dashboardFrame'
import Statistics from './components/Statistics/statistics'
import Footer from './components/Footer/footer'
import './app.scss'

const Dashboard = lazy(async () => {
  const component = import('./components/Dashboard/dashboard')
  await new Promise((resolve) => setTimeout(resolve, 250))
  return component
})

const UserWebsocketProvider = ({ children }: PropsWithChildren) => (
  <DiscordUserProvider>
    <WebsocketProvider>
      {children}
    </WebsocketProvider>
  </DiscordUserProvider>
)

const isMobile = window.matchMedia('screen and (max-width: 768px)').matches

function App() {
  return (
    <Fragment>
      <ToastContainer position={isMobile ? 'top-center' : 'top-center'} theme={'dark'} transition={Slide}/>
      <SkeletonTheme baseColor={'#3f3f3f'} customHighlightBackground={'linear-gradient(to right, #3f3f3f 0%, #484848 80%, #3f3f3f 100%)'}>
        <BrowserRouter>
          <Routes>
            <Route
              index
              element={(
                <Fragment>
                  <Navbar displayLinks={true}/>
                  <Header/>
                  <Home/>
                  <Footer/>
                </Fragment>
              )}
            />
            <Route
              path={'/dashboard'}
              element={(
                <UserWebsocketProvider>
                  <Suspense fallback={<DashboardFrame/>}>
                    <Dashboard/>
                  </Suspense>
                </UserWebsocketProvider>
              )}
            />
            <Route
              path={'/statistics'}
              element={(
                <UserWebsocketProvider>
                  <Statistics/>
                </UserWebsocketProvider>
              )}
            />
          </Routes>
        </BrowserRouter>
      </SkeletonTheme>
    </Fragment>
  )
}

const root = createRoot(document.querySelector<HTMLDivElement>('.app')!)
root.render(<App/>)
