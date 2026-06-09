import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Homepages/Header';
import Banner from './components/Homepages/Banner';
import Category from './components/Homepages/Collection';
import CategoryPage from './components/CollectionPage';
import Favorite from './components/Homepages/Favorite';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={
          <>
            <Banner />
            <Category />
          </>
        } />
        <Route path="/collections/:slug" element={<CategoryPage />} />
      </Routes>
      <Favorite />
    </BrowserRouter>
  );
}

export default App;
