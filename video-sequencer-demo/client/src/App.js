import React, { useState } from 'react';
import VideoEditor from './components/VideoEditor';
import AssetLibrary from './components/AssetLibrary';

function App() {
  const [currentView, setCurrentView] = useState('asset-library'); // Start with Asset Library for hackathon demo
  const [extractedClips, setExtractedClips] = useState([]);
  const [sourceAsset, setSourceAsset] = useState(null);

  const handleLoadToTimeline = (clips, asset) => {
    setExtractedClips(clips);
    setSourceAsset(asset);
    setCurrentView('timeline-editor');
  };

  const handleBackToAssets = () => {
    setCurrentView('asset-library');
  };

  if (currentView === 'asset-library') {
    return <AssetLibrary onLoadToTimeline={handleLoadToTimeline} />;
  }

  return (
    <VideoEditor
      preloadedClips={extractedClips}
      sourceAsset={sourceAsset}
      onBackToAssets={handleBackToAssets}
    />
  );
}

export default App;