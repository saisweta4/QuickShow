import React, { useEffect } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { Outlet } from 'react-router-dom';
import Dashboard from './Dashboard';
import AddShows from './AddShows';
import Loading from '../../components/Loading';
import { useAppContext } from '../../context/AppContext';

const Layout = () => {
 const {isAdmin,fetchIsAdmin}= useAppContext()

 useEffect(()=>{
   fetchIsAdmin()
 },[])



  return isAdmin ?(
    <>
      <AdminNavbar />
      <div className='flex'>
        <AdminSidebar />
        <div className='flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto'>
            <Outlet />
        </div>
      </div>
    </>
  ): <Loading />
};

export default Layout;