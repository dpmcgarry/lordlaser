import React, { useRef, useState } from 'react';
import './App.css';
import "@cloudscape-design/global-styles/index.css"
import { AppLayout } from '@cloudscape-design/components';
import { Navigation } from './Navigation';
import FeedTable from './FeedTable';

function App() {
    const appLayout = useRef();
    return (
        <AppLayout
        contentType="table"
        content={<FeedTable/>}
        navigation={<Navigation activeHref="#/distributions" />}
        toolsHide={true}
        />
    );
}

export default App;
