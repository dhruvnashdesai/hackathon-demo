import React, { useState, useEffect } from 'react';
import { Play, Clock, Zap, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AssetLibrary = ({ onLoadToTimeline }) => {
  const [videos, setVideos] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [extractedClips, setExtractedClips] = useState([]);
  const [showExtractionResults, setShowExtractionResults] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [modalAnalysisData, setModalAnalysisData] = useState(null);
  const [modalAnalysisType, setModalAnalysisType] = useState('');

  useEffect(() => {
    loadAvailableVideos();
  }, []);

  const loadAvailableVideos = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/assets/available');
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  const handleVideoSelect = async (video) => {
    setLoading(true);
    setLoadingMessage('Analyzing video with AI...');
    setSelectedAsset(null);
    setShowExtractionResults(false);
    setExtractedClips([]);

    try {
      const response = await fetch('http://localhost:3001/api/assets/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          filename: video.filename,
          platform: 'tiktok'
        })
      });

      if (!response.ok) throw new Error('Failed to analyze video');

      const asset = await response.json();
      setSelectedAsset(asset);
    } catch (error) {
      console.error('Error selecting video:', error);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleExtractClips = async () => {
    if (!onLoadToTimeline) return;

    // Navigate to timeline editor without any clips - let user import and analyze manually
    onLoadToTimeline([], null);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const openAnalysisModal = (analysisData, analysisType) => {
    setModalAnalysisData(analysisData);
    setModalAnalysisType(analysisType);
    setShowAnalysisModal(true);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      {/* Left Panel - Video Library */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">Director Labs</h1>
              <p className="text-sm text-gray-400 mt-1">Transform long-form content into viral short clips</p>
            </div>
            <button
              onClick={handleExtractClips}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Timeline Editor
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-lg font-semibold mb-4">1. Select Video</h2>
          <div className="space-y-3">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => handleVideoSelect(video)}
                className={`cursor-pointer p-3 rounded-lg border transition-colors ${
                  selectedAsset?.videoId === video.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                }`}
              >
                <div className="aspect-video bg-gray-600 rounded mb-2 flex items-center justify-center">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.filename} className="w-full h-full object-cover rounded" />
                  ) : (
                    <Play className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium truncate">{video.filename}</div>
                  <div className="text-gray-400">{formatDuration(video.duration)}</div>
                  <div className="text-xs text-gray-500 mt-1">{video.brand}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Analysis & Results */}
      <div className="flex-1 flex flex-col">
        {!selectedAsset && !loading ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-gray-500">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Select a Video to Begin</p>
              <p className="text-sm max-w-md">
                Choose a long-form video from the left to see its analysis and extract clips for short-form optimization.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-gray-500">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Loading Analysis...</p>
              <p className="text-sm max-w-md">{loadingMessage}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Analysis Section */}
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold mb-4">2. AI Analysis Results</h2>

              {/* TwelveLabs Analysis */}
              {selectedAsset.twelveLabsAnalysis?.tiktok && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">TwelveLabs Analysis</h3>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    {(() => {
                      let analysis = selectedAsset.twelveLabsAnalysis.tiktok;

                      // Display as formatted text since it's from the Analyze API
                      if (typeof analysis === 'string') {
                        try {
                          // Try to parse as JSON first in case it's structured data
                          const cleanJson = analysis
                            .split('\n')
                            .filter(line => !line.includes('event_type') && !line.includes('data:'))
                            .join('\n')
                            .replace(/data:\s*/g, '')
                            .trim();

                          if (cleanJson.startsWith('{')) {
                            analysis = JSON.parse(cleanJson);
                          } else {
                            // Display as formatted text with better styling
                            return (
                              <div className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown
                                  components={{
                                    h1: ({children}) => <h1 className="text-xl font-bold text-blue-300 mb-4">{children}</h1>,
                                    h2: ({children}) => <h2 className="text-lg font-semibold text-blue-300 mb-3">{children}</h2>,
                                    h3: ({children}) => <h3 className="text-base font-medium text-blue-200 mb-2">{children}</h3>,
                                    ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                                    ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                                    li: ({children}) => <li className="text-gray-300">{children}</li>,
                                    strong: ({children}) => <strong className="text-blue-200 font-semibold">{children}</strong>,
                                    p: ({children}) => <p className="mb-3 text-gray-300">{children}</p>
                                  }}
                                >
                                  {analysis}
                                </ReactMarkdown>
                              </div>
                            );
                          }
                        } catch (e) {
                          // Display as formatted text with better styling
                          return (
                            <div className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  h1: ({children}) => <h1 className="text-xl font-bold text-blue-300 mb-4">{children}</h1>,
                                  h2: ({children}) => <h2 className="text-lg font-semibold text-blue-300 mb-3">{children}</h2>,
                                  h3: ({children}) => <h3 className="text-base font-medium text-blue-200 mb-2">{children}</h3>,
                                  ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                                  ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                                  li: ({children}) => <li className="text-gray-300">{children}</li>,
                                  strong: ({children}) => <strong className="text-blue-200 font-semibold">{children}</strong>,
                                  p: ({children}) => <p className="mb-3 text-gray-300">{children}</p>
                                }}
                              >
                                {analysis}
                              </ReactMarkdown>
                            </div>
                          );
                        }
                      }

                      if (typeof analysis === 'object' && analysis) {
                        return (
                          <div className="space-y-4">
                            {/* Score and Grade */}
                            {analysis.total_score && (
                              <div
                                className="flex justify-between items-center p-3 bg-blue-900/30 rounded cursor-pointer hover:bg-blue-900/50 transition-colors"
                                onClick={() => openAnalysisModal(analysis, 'TwelveLabs Analysis')}
                              >
                                <span className="font-medium text-blue-300">Total Score</span>
                                <span className="text-xl font-bold text-blue-200">{analysis.total_score}/100 →</span>
                              </div>
                            )}
                            {analysis.overall_grade && (
                              <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                                <span className="text-gray-400">Grade</span>
                                <span className="font-bold text-white">{analysis.overall_grade}</span>
                              </div>
                            )}

                            {/* Key Insights */}
                            {analysis.key_insights && Array.isArray(analysis.key_insights) && (
                              <div>
                                <h4 className="font-medium text-blue-300 mb-2">Key Insights</h4>
                                <ul className="space-y-1 text-sm text-gray-300">
                                  {analysis.key_insights.map((insight, i) => (
                                    <li key={i} className="flex items-start">
                                      <span className="text-blue-400 mr-2">•</span>
                                      <span>{insight}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Extraction Analysis */}
                            {analysis.extraction_analysis && (
                              <div>
                                <h4 className="font-medium text-blue-300 mb-2">Extraction Analysis</h4>
                                <div className="bg-blue-900/20 p-3 rounded">
                                  {analysis.extraction_analysis.strong_segments && (
                                    <div className="mb-3">
                                      <h5 className="text-sm font-medium text-blue-200 mb-2">Strong Segments</h5>
                                      {analysis.extraction_analysis.strong_segments.map((segment, i) => (
                                        <div key={i} className="mb-2 p-2 bg-gray-700 rounded text-xs">
                                          <div className="text-blue-300 font-medium">{segment.timestamp}</div>
                                          <div className="text-gray-300">{segment.strategic_notes}</div>
                                          <div className="text-gray-400">Score: {segment.total_score}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {analysis.extraction_analysis.recommended_sequence && (
                                    <div className="text-sm text-gray-300">
                                      <span className="text-blue-300">Recommended Sequence: </span>
                                      {analysis.extraction_analysis.recommended_sequence.join(' → ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Watch Time Optimization */}
                            {analysis.watch_time_optimization && (
                              <div>
                                <h4 className="font-medium text-blue-300 mb-2">Watch Time Optimization</h4>
                                <div className="bg-blue-900/20 p-3 rounded text-sm space-y-2">
                                  {analysis.watch_time_optimization.predicted_completion_rate && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Predicted Completion Rate</span>
                                      <span className="text-blue-200">{analysis.watch_time_optimization.predicted_completion_rate}</span>
                                    </div>
                                  )}
                                  {analysis.watch_time_optimization.predicted_engagement_rate && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Predicted Engagement Rate</span>
                                      <span className="text-blue-200">{analysis.watch_time_optimization.predicted_engagement_rate}</span>
                                    </div>
                                  )}
                                  {analysis.watch_time_optimization.rewatch_potential && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Rewatch Potential</span>
                                      <span className="text-blue-200 capitalize">{analysis.watch_time_optimization.rewatch_potential}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* TikTok Optimizations */}
                            {analysis.tiktok_optimizations && (
                              <div>
                                <h4 className="font-medium text-blue-300 mb-2">TikTok Optimizations</h4>
                                <div className="bg-blue-900/20 p-3 rounded text-sm space-y-2">
                                  {analysis.tiktok_optimizations.face_frequency_score && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Face Frequency Score</span>
                                      <span className="text-blue-200">{analysis.tiktok_optimizations.face_frequency_score}</span>
                                    </div>
                                  )}
                                  {analysis.tiktok_optimizations.central_action_percentage && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Central Action %</span>
                                      <span className="text-blue-200">{analysis.tiktok_optimizations.central_action_percentage}%</span>
                                    </div>
                                  )}
                                  {analysis.tiktok_optimizations.visual_variety_score && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Visual Variety Score</span>
                                      <span className="text-blue-200">{analysis.tiktok_optimizations.visual_variety_score}</span>
                                    </div>
                                  )}
                                  {analysis.tiktok_optimizations.cover_frame_recommendation && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Cover Frame</span>
                                      <span className="text-blue-200">{analysis.tiktok_optimizations.cover_frame_recommendation}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return <div className="text-sm text-gray-500">Analysis data not available</div>;
                      }
                    })()}
                  </div>
                </div>
              )}


              {/* Claude TikTok Analysis */}
              {selectedAsset.tiktokAnalysis && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Claude TikTok Analysis</h3>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    {(() => {
                      const analysis = selectedAsset.tiktokAnalysis;
                      if (typeof analysis === 'string') {
                        return <div className="text-sm text-gray-300 whitespace-pre-wrap">{analysis}</div>;
                      } else if (typeof analysis === 'object' && analysis) {
                        return (
                          <div className="space-y-4">
                            {/* Score and Grade */}
                            {analysis.total_score && (
                              <div
                                className="flex justify-between items-center p-3 bg-green-900/30 rounded cursor-pointer hover:bg-green-900/50 transition-colors"
                                onClick={() => openAnalysisModal(analysis, 'Claude TikTok Analysis')}
                              >
                                <span className="font-medium text-green-300">Total Score</span>
                                <span className="text-xl font-bold text-green-200">{analysis.total_score}/100 →</span>
                              </div>
                            )}
                            {analysis.overall_grade && (
                              <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                                <span className="text-gray-400">Grade</span>
                                <span className="font-bold text-white">{analysis.overall_grade}</span>
                              </div>
                            )}

                            {/* Key Insights */}
                            {analysis.key_insights && Array.isArray(analysis.key_insights) && (
                              <div>
                                <h4 className="font-medium text-green-300 mb-2">Key Insights</h4>
                                <ul className="space-y-1 text-sm text-gray-300">
                                  {analysis.key_insights.map((insight, i) => (
                                    <li key={i} className="flex items-start">
                                      <span className="text-green-400 mr-2">•</span>
                                      <span>{insight}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Dimension Scores */}
                            {analysis.dimension_scores && (
                              <div>
                                <h4 className="font-medium text-green-300 mb-2">Dimension Scores</h4>
                                <div className="bg-green-900/20 p-3 rounded space-y-2">
                                  {analysis.dimension_scores.hook_quality && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Hook Quality & First Impression</span>
                                      <span className="text-green-200">{analysis.dimension_scores.hook_quality}/25</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.content_modularity && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Content Modularity</span>
                                      <span className="text-green-200">{analysis.dimension_scores.content_modularity}/20</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.tiktok_optimization && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">TikTok-Specific Optimization</span>
                                      <span className="text-green-200">{analysis.dimension_scores.tiktok_optimization}/20</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.engagement_retention && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Engagement & Retention</span>
                                      <span className="text-green-200">{analysis.dimension_scores.engagement_retention}/20</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.viral_potential && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Viral Potential & Shareability</span>
                                      <span className="text-green-200">{analysis.dimension_scores.viral_potential}/15</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Top Clip Opportunities */}
                            {analysis.top_clip_opportunities && Array.isArray(analysis.top_clip_opportunities) && (
                              <div>
                                <h4 className="font-medium text-green-300 mb-2">Top Clip Opportunities</h4>
                                <div className="bg-green-900/20 p-3 rounded">
                                  {analysis.top_clip_opportunities.slice(0, 3).map((clip, i) => (
                                    <div key={i} className="mb-2 p-2 bg-gray-700 rounded text-xs">
                                      <div className="text-green-300 font-medium">{clip.timestamp || `Clip ${i + 1}`}</div>
                                      <div className="text-gray-300">{clip.description}</div>
                                      {clip.score && <div className="text-gray-400">Score: {clip.score}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Strategic Recommendations */}
                            {analysis.strategic_recommendations && Array.isArray(analysis.strategic_recommendations) && (
                              <div>
                                <h4 className="font-medium text-green-300 mb-2">Strategic Recommendations</h4>
                                <div className="bg-green-900/20 p-3 rounded">
                                  <ul className="space-y-1 text-sm text-gray-300">
                                    {analysis.strategic_recommendations.map((rec, i) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-green-400 mr-2">•</span>
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return <div className="text-sm text-gray-500">Analysis data not available</div>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Claude Instagram Analysis */}
              {selectedAsset.instagramAnalysis && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-400 mb-3">Claude Instagram Analysis</h3>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    {(() => {
                      const analysis = selectedAsset.instagramAnalysis;
                      if (typeof analysis === 'string') {
                        return <div className="text-sm text-gray-300 whitespace-pre-wrap">{analysis}</div>;
                      } else if (typeof analysis === 'object' && analysis) {
                        return (
                          <div className="space-y-4">
                            {/* Score and Grade */}
                            {analysis.total_score && (
                              <div
                                className="flex justify-between items-center p-3 bg-purple-900/30 rounded cursor-pointer hover:bg-purple-900/50 transition-colors"
                                onClick={() => openAnalysisModal(analysis, 'Claude Instagram Analysis')}
                              >
                                <span className="font-medium text-purple-300">Total Score</span>
                                <span className="text-xl font-bold text-purple-200">{analysis.total_score}/100 →</span>
                              </div>
                            )}
                            {analysis.overall_grade && (
                              <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                                <span className="text-gray-400">Grade</span>
                                <span className="font-bold text-white">{analysis.overall_grade}</span>
                              </div>
                            )}

                            {/* Key Insights */}
                            {analysis.key_insights && Array.isArray(analysis.key_insights) && (
                              <div>
                                <h4 className="font-medium text-purple-300 mb-2">Key Insights</h4>
                                <ul className="space-y-1 text-sm text-gray-300">
                                  {analysis.key_insights.map((insight, i) => (
                                    <li key={i} className="flex items-start">
                                      <span className="text-purple-400 mr-2">•</span>
                                      <span>{insight}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Dimension Scores */}
                            {analysis.dimension_scores && (
                              <div>
                                <h4 className="font-medium text-purple-300 mb-2">Dimension Scores</h4>
                                <div className="bg-purple-900/20 p-3 rounded space-y-2">
                                  {analysis.dimension_scores.visual_quality && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Visual Quality & Instagram Aesthetic</span>
                                      <span className="text-purple-200">{analysis.dimension_scores.visual_quality}/25</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.community_engagement && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Community Engagement Potential</span>
                                      <span className="text-purple-200">{analysis.dimension_scores.community_engagement}/20</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.algorithm_optimization && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Algorithm Optimization</span>
                                      <span className="text-purple-200">{analysis.dimension_scores.algorithm_optimization}/20</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.audience_retention && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Audience Retention & Engagement</span>
                                      <span className="text-purple-200">{analysis.dimension_scores.audience_retention}/20</span>
                                    </div>
                                  )}
                                  {analysis.dimension_scores.discovery_growth && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Discovery & Growth Potential</span>
                                      <span className="text-purple-200">{analysis.dimension_scores.discovery_growth}/15</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Visual Moments */}
                            {analysis.visual_moments && Array.isArray(analysis.visual_moments) && (
                              <div>
                                <h4 className="font-medium text-purple-300 mb-2">Visual Moments</h4>
                                <div className="bg-purple-900/20 p-3 rounded">
                                  {analysis.visual_moments.slice(0, 3).map((moment, i) => (
                                    <div key={i} className="mb-2 p-2 bg-gray-700 rounded text-xs">
                                      <div className="text-purple-300 font-medium">{moment.timestamp || `Moment ${i + 1}`}</div>
                                      <div className="text-gray-300">{moment.description}</div>
                                      {moment.aesthetic_score && <div className="text-gray-400">Aesthetic Score: {moment.aesthetic_score}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Brand Integration */}
                            {analysis.brand_integration && (
                              <div>
                                <h4 className="font-medium text-purple-300 mb-2">Brand Integration</h4>
                                <div className="bg-purple-900/20 p-3 rounded text-sm space-y-2">
                                  {analysis.brand_integration.authenticity_score && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Authenticity Score</span>
                                      <span className="text-purple-200">{analysis.brand_integration.authenticity_score}/100</span>
                                    </div>
                                  )}
                                  {analysis.brand_integration.lifestyle_alignment && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Lifestyle Alignment</span>
                                      <span className="text-purple-200 capitalize">{analysis.brand_integration.lifestyle_alignment}</span>
                                    </div>
                                  )}
                                  {analysis.brand_integration.aspirational_value && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Aspirational Value</span>
                                      <span className="text-purple-200 capitalize">{analysis.brand_integration.aspirational_value}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Reels Optimization */}
                            {analysis.reels_optimization && Array.isArray(analysis.reels_optimization) && (
                              <div>
                                <h4 className="font-medium text-purple-300 mb-2">Reels Optimization</h4>
                                <div className="bg-purple-900/20 p-3 rounded">
                                  <ul className="space-y-1 text-sm text-gray-300">
                                    {analysis.reels_optimization.map((tip, i) => (
                                      <li key={i} className="flex items-start">
                                        <span className="text-purple-400 mr-2">•</span>
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return <div className="text-sm text-gray-500">Analysis data not available</div>;
                      }
                    })()}
                  </div>
                </div>
              )}

            </div>

            {/* Extract Clips Section */}
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold mb-3">3. Extract Key Moments</h2>
              <p className="text-gray-400 mb-4">
                AI will identify the most engaging scenes for short-form content
              </p>
              <button
                onClick={handleExtractClips}
                disabled={loading || showExtractionResults}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-3 rounded-lg transition-colors flex items-center"
              >
                <Zap className="h-5 w-5 mr-2" />
                {loading ? loadingMessage : showExtractionResults ? 'Clips Extracted ✓' : 'Extract Clips'}
              </button>
            </div>

            {/* Extracted Clips Results */}
            {showExtractionResults && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">4. Extracted Clips ({extractedClips.length})</h2>
                <div className="grid grid-cols-2 gap-4">
                  {extractedClips.map((clip, index) => (
                    <div key={clip.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="aspect-video bg-gray-700 rounded mb-3 flex items-center justify-center">
                        <Play className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium mb-1">{clip.title}</div>
                        <div className="text-gray-400 mb-2">{formatDuration(clip.duration)}</div>
                        {clip.score && (
                          <div className={`text-xs px-2 py-1 rounded text-white ${getScoreColor(clip.score.ability)}`}>
                            Score: {Math.round(clip.score.ability)}/100
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-900/30 rounded-lg">
                  <h3 className="font-medium text-blue-400 mb-2">Next Steps:</h3>
                  <ul className="text-blue-200 text-sm space-y-1">
                    <li>• AI sequences clips for maximum engagement</li>
                    <li>• Optimizes for 15-30 second format</li>
                    <li>• Generates platform-specific narratives</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Detail Modal */}
      {showAnalysisModal && modalAnalysisData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{modalAnalysisType} - Detailed Breakdown</h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {(() => {
                const analysis = modalAnalysisData;
                const isBlue = modalAnalysisType.includes('TwelveLabs');
                const isGreen = modalAnalysisType.includes('TikTok') && !modalAnalysisType.includes('TwelveLabs');
                const isPurple = modalAnalysisType.includes('Instagram');

                const primaryColor = isBlue ? 'blue' : isGreen ? 'green' : 'purple';

                return (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    {analysis.total_score && (
                      <div className={`p-4 bg-${primaryColor}-900/30 rounded-lg`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-lg font-medium text-${primaryColor}-300`}>Overall Score</span>
                          <span className={`text-3xl font-bold text-${primaryColor}-200`}>{analysis.total_score}/100</span>
                        </div>
                        {analysis.overall_grade && (
                          <div className={`text-sm text-${primaryColor}-400`}>Grade: {analysis.overall_grade}</div>
                        )}
                      </div>
                    )}

                    {/* All Individual Metrics */}
                    {(() => {
                      // Collect all numeric metrics from the analysis
                      const allMetrics = [];

                      // Helper to format metric names
                      const formatMetricName = (key) => {
                        return key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, l => l.toUpperCase())
                          .replace(/([A-Z])/g, ' $1')
                          .trim();
                      };

                      // Helper to determine max value for percentage calculation
                      const getMaxValue = (key, value) => {
                        // Main dimension scores (from framework)
                        if (key.includes('hook_quality') || key.includes('visual_quality_aesthetic')) return 25;
                        if (key.includes('viral') || key.includes('discovery')) return 15;

                        // Instagram optimization specific (all should be 0-10 scale)
                        if (key.includes('instagram_optimizations_face_frequency_score') ||
                            key.includes('instagram_optimizations_visual_variety_score') ||
                            key.includes('instagram_optimizations_quality_after_crop')) {
                          return 10;
                        }
                        if (key.includes('central_action_percentage')) return 100; // This is a percentage

                        // General metrics
                        if (key.includes('percentage') || key.includes('rate')) return 100;
                        if (key.includes('completion_rate') || key.includes('engagement_rate')) return 100;
                        if (key.includes('score') && !key.includes('dimension')) {
                          // For scores, if value is over 100, use the value itself as max
                          return value > 100 ? value : 100;
                        }

                        // Smart detection: if value seems unreasonable for the default, adjust
                        if (value > 20) {
                          // Probably out of 100 or the value itself is reasonable
                          return value > 100 ? value : 100;
                        } else if (value <= 10) {
                          // Probably out of 10
                          return 10;
                        }

                        return 20; // Default for most dimension scores
                      };

                      // Recursively extract metrics from nested objects
                      const extractMetrics = (obj, prefix = '') => {
                        Object.entries(obj).forEach(([key, value]) => {
                          const fullKey = prefix ? `${prefix}_${key}` : key;

                          if (typeof value === 'number') {
                            allMetrics.push({
                              key: fullKey,
                              value: value,
                              displayName: formatMetricName(fullKey),
                              maxValue: getMaxValue(fullKey)
                            });
                          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            extractMetrics(value, fullKey);
                          }
                        });
                      };

                      extractMetrics(analysis);

                      // Update max values after extracting all metrics
                      allMetrics.forEach(metric => {
                        metric.maxValue = getMaxValue(metric.key, metric.value);
                      });

                      // Sort metrics by value descending
                      allMetrics.sort((a, b) => b.value - a.value);

                      if (allMetrics.length === 0) return null;

                      return (
                        <div>
                          <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>Detailed Metrics</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {allMetrics.map((metric, index) => (
                              <div key={index} className="bg-gray-700 p-3 rounded-lg text-center">
                                <div className={`text-xl font-bold text-${primaryColor}-200 mb-1`}>
                                  {metric.value}
                                  <span className="text-sm text-gray-400">/{metric.maxValue}</span>
                                </div>
                                <div className="text-xs text-gray-300 leading-tight">
                                  {metric.displayName}
                                </div>
                                <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
                                  <div
                                    className={`bg-${primaryColor}-500 h-1 rounded-full`}
                                    style={{ width: `${Math.min((metric.value / metric.maxValue) * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {Math.round((metric.value / metric.maxValue) * 100)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Key Insights */}
                    {analysis.key_insights && Array.isArray(analysis.key_insights) && (
                      <div>
                        <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>Key Insights</h3>
                        <ul className="space-y-2">
                          {analysis.key_insights.map((insight, i) => (
                            <li key={i} className="flex items-start text-gray-300">
                              <span className={`text-${primaryColor}-400 mr-2 font-bold`}>•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Extraction Analysis */}
                    {analysis.extraction_analysis && (
                      <div>
                        <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>Extraction Analysis</h3>
                        <div className={`bg-${primaryColor}-900/20 p-4 rounded-lg space-y-4`}>
                          {analysis.extraction_analysis.strong_segments && (
                            <div>
                              <h4 className={`font-medium text-${primaryColor}-300 mb-2`}>Strong Segments</h4>
                              {analysis.extraction_analysis.strong_segments.map((segment, i) => (
                                <div key={i} className="bg-gray-700 p-3 rounded mb-2">
                                  <div className={`text-${primaryColor}-300 font-medium`}>{segment.timestamp}</div>
                                  <div className="text-gray-300 mt-1">{segment.strategic_notes}</div>
                                  <div className="text-gray-400 text-sm mt-1">Score: {segment.total_score}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {analysis.extraction_analysis.recommended_sequence && (
                            <div>
                              <h4 className={`font-medium text-${primaryColor}-300 mb-2`}>Recommended Sequence</h4>
                              <div className="text-gray-300">
                                {analysis.extraction_analysis.recommended_sequence.join(' → ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Watch Time Optimization */}
                    {analysis.watch_time_optimization && (
                      <div>
                        <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>Watch Time Optimization</h3>
                        <div className={`bg-${primaryColor}-900/20 p-4 rounded-lg space-y-3`}>
                          {Object.entries(analysis.watch_time_optimization).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className={`text-${primaryColor}-200 font-medium`}>
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TikTok Optimizations */}
                    {analysis.tiktok_optimizations && (
                      <div>
                        <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>TikTok Optimizations</h3>
                        <div className={`bg-${primaryColor}-900/20 p-4 rounded-lg space-y-3`}>
                          {Object.entries(analysis.tiktok_optimizations).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className={`text-${primaryColor}-200 font-medium`}>
                                {typeof value === 'string' ? value : `${value}${key.includes('percentage') ? '%' : ''}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instagram Optimizations */}
                    {analysis.brand_integration && (
                      <div>
                        <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>Brand Integration</h3>
                        <div className={`bg-${primaryColor}-900/20 p-4 rounded-lg space-y-3`}>
                          {Object.entries(analysis.brand_integration).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className={`text-${primaryColor}-200 font-medium capitalize`}>
                                {typeof value === 'string' ? value : `${value}${key.includes('score') ? '/100' : ''}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strategic Recommendations */}
                    {analysis.strategic_recommendations && Array.isArray(analysis.strategic_recommendations) && (
                      <div>
                        <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>Strategic Recommendations</h3>
                        <ul className="space-y-2">
                          {analysis.strategic_recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start text-gray-300">
                              <span className={`text-${primaryColor}-400 mr-2 font-bold`}>•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Top Clip Opportunities */}
                    {analysis.top_clip_opportunities && Array.isArray(analysis.top_clip_opportunities) && (
                      <div>
                        <h3 className={`text-lg font-semibold text-${primaryColor}-400 mb-3`}>Top Clip Opportunities</h3>
                        <div className="space-y-3">
                          {analysis.top_clip_opportunities.map((clip, i) => (
                            <div key={i} className="bg-gray-700 p-3 rounded">
                              <div className={`text-${primaryColor}-300 font-medium`}>{clip.timestamp || `Clip ${i + 1}`}</div>
                              <div className="text-gray-300 mt-1">{clip.description}</div>
                              {clip.score && <div className="text-gray-400 text-sm mt-1">Score: {clip.score}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetLibrary;