const Anthropic = require('@anthropic-ai/sdk');

class ClaudeService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  async analyzeLongFormVideo(tlAnalysis, platform = 'tiktok') {
    console.log('🎯 CLAUDE LONG-FORM ANALYSIS - Starting...');
    console.log('📊 Input TL Analysis:', JSON.stringify(tlAnalysis, null, 2));

    const prompt = this.getAnalysisPrompt(platform, tlAnalysis);


    console.log('📝 Long-form analysis prompt length:', prompt.length, 'characters');
    console.log('🚀 Calling Claude Sonnet API for long-form analysis...');

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      console.log('✅ Claude long-form analysis response received');
      console.log('📥 Raw analysis response:', JSON.stringify(response, null, 2));

      const content = response.content[0].text;
      console.log('📄 Analysis response content:', content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No JSON found in Claude long-form analysis response');
        console.error('Full content was:', content);
        throw new Error('No valid JSON found in long-form analysis response');
      }

      console.log('🔍 Extracted long-form analysis JSON:', jsonMatch[0]);

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully parsed long-form analysis JSON:', parsed);

      return parsed;
    } catch (error) {
      console.error('❌ CLAUDE LONG-FORM ANALYSIS ERROR:', error.message);
      console.error('Full long-form analysis error:', error);
      throw error;
    }
  }

  async scoreClip(tlAnalysis) {
    console.log('🎯 CLAUDE SCORING - Starting...');
    console.log('📊 Input TL Analysis:', JSON.stringify(tlAnalysis, null, 2));

    const prompt = `Analyze this video clip data and score it across 6 dimensions:

CLIP DATA:
${JSON.stringify(tlAnalysis, null, 2)}

Score each dimension (0-100):
1. Clarity (20% weight): Visual/audio quality, comprehensibility
2. Salience (15% weight): Subject matter importance, relevance
3. Hook (25% weight): Attention-grabbing opening, engagement factor
4. Emotion (15% weight): Emotional impact, resonance
5. Suitability (15% weight): Platform appropriateness, target audience fit
6. Pacing (10% weight): Rhythm, timing, flow

Calculate weighted Ability score: (Clarity*0.2 + Salience*0.15 + Hook*0.25 + Emotion*0.15 + Suitability*0.15 + Pacing*0.1)

Determine the top-performing dimension and assign one badge:
- "Crystal Clear" (Clarity top)
- "Strong Subject" (Salience top)
- "Strong Hook" (Hook top)
- "Emotionally Resonant" (Emotion top)
- "Perfect Fit" (Suitability top)
- "Great Rhythm" (Pacing top)

Return JSON only:
{
  "clarity": number,
  "salience": number,
  "hook": number,
  "emotion": number,
  "suitability": number,
  "pacing": number,
  "ability": number,
  "topDimension": "string",
  "badge": "string",
  "reasoning": "1-2 sentence explanation"
}`;

    console.log('📝 Prompt length:', prompt.length, 'characters');
    console.log('🚀 Calling Claude Haiku API...');

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      console.log('✅ Claude API Response received');
      console.log('📥 Raw response:', JSON.stringify(response, null, 2));

      const content = response.content[0].text;
      console.log('📄 Response content:', content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No JSON found in Claude response');
        console.error('Full content was:', content);
        throw new Error('No valid JSON found in response');
      }

      console.log('🔍 Extracted JSON:', jsonMatch[0]);

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully parsed JSON:', parsed);

      return parsed;
    } catch (error) {
      console.error('❌ CLAUDE SCORING ERROR:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  async sequenceClips(clipsArray) {
    console.log('🎬 CLAUDE SEQUENCING - Starting...');
    console.log('📊 Input clips array length:', clipsArray.length);
    console.log('📊 Input clips data:', JSON.stringify(clipsArray, null, 2));

    const prompt = `Transform these video clips into a VIRAL 15-30 second short-form video optimized for TikTok/Instagram Reels and Gen Z engagement.

CLIPS:
${JSON.stringify(clipsArray, null, 2)}

GEN Z OPTIMIZATION RULES:
1. HOOK FIRST: Start with the most engaging/shocking/intriguing moment (3-second rule)
2. FAST PACING: Quick cuts, high energy, no slow moments
3. EMOTIONAL PEAKS: Prioritize clips with strong emotions (surprise, excitement, humor, awe)
4. VISUAL PUNCH: Bold visuals, contrast, movement, close-ups over wide shots
5. STORY ARC: Problem → Solution or Before → After in under 30 seconds
6. TRENDING ELEMENTS: Relatable scenarios, behind-the-scenes, transformations

SEQUENCING PRIORITIES:
1. STRONGEST HOOK (0-3s): Most attention-grabbing clip first
2. BUILD MOMENTUM (3-15s): Stack high-energy moments, no filler
3. CLIMAX/PAYOFF (15-25s): Biggest reveal, transformation, or emotional peak
4. STRONG CLOSE (25-30s): Memorable ending that drives action

VIRAL OPTIMIZATION CRITERIA:
- Exclude slow/boring content regardless of production value
- Prioritize authentic moments over polished scenes
- Focus on relatability and shareability
- Optimize for mobile viewing (vertical preferred)
- Create "binge-worthy" momentum that makes viewers rewatch

CONTENT STRATEGY:
- Transform brand messaging into story-driven content
- Make corporate content feel authentic and personal
- Focus on human moments and emotional connections
- Create curiosity gaps that drive engagement

CRITICAL REQUIREMENT: Your response MUST include EXACTLY these 7 fields or it will be rejected:
1. sequence - array of selected clip IDs
2. excluded_clips - array of rejected clips with reasons
3. narrative_structure - story arc description
4. reasoning - sequencing explanation
5. estimated_total_duration - total seconds
6. theme_analysis - main theme/story description (REQUIRED)
7. voiceover_script - complete narration object (REQUIRED)

Do NOT omit theme_analysis or voiceover_script. Include them or the response fails.

Return ONLY this exact JSON structure:
{
  "sequence": ["clipId1", "clipId2", ...],
  "excluded_clips": [
    {
      "clipId": "clipId",
      "reason": "brief explanation"
    }
  ],
  "narrative_structure": "brief description of story arc",
  "reasoning": "brief explanation of sequencing decisions",
  "estimated_total_duration": number_in_seconds,
  "theme_analysis": "viral hook angle and Gen Z appeal factor (e.g., 'Behind-the-scenes transformation that breaks corporate facade')",
  "voiceover_script": {
    "full_script": "Gen Z-focused narration with trending language, conversational tone, and viral hooks",
    "estimated_speech_duration": number_in_seconds,
    "total_words": number,
    "segments": [
      {
        "text": "script text for this clip using Gen Z language and viral patterns",
        "timing": "X-Y seconds",
        "tone": "conversational/authentic/hype/relatable/etc"
      }
    ]
  }
}`;

    console.log('📝 Sequencing prompt length:', prompt.length, 'characters');
    console.log('🚀 Calling Claude Sonnet API...');

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      console.log('✅ Claude Sonnet API Response received');
      console.log('📥 Raw sequencing response:', JSON.stringify(response, null, 2));

      const content = response.content[0].text;
      console.log('📄 Sequencing response content:', content);

      // Try to extract JSON more carefully
      let jsonStr = content;

      // Look for JSON blocks wrapped in ```json or just braces
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      } else {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      if (!jsonStr || jsonStr.trim() === '') {
        console.error('❌ No JSON found in Claude sequencing response');
        console.error('Full sequencing content was:', content);
        throw new Error('No valid JSON found in response');
      }

      console.log('🔍 Extracted sequencing JSON:', jsonStr);

      // Careful cleanup - preserve content within quotes, only clean structure
      jsonStr = jsonStr
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .trim();

      console.log('🧹 Cleaned JSON:', jsonStr);

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
        console.log('✅ JSON parse successful!');
      } catch (parseError) {
        console.error('❌ JSON parse failed:', parseError.message);
        console.error('Problematic JSON at position:', parseError.message.match(/position (\d+)/)?.[1]);

        // Log the problematic area for debugging
        if (parseError.message.match(/position (\d+)/)) {
          const pos = parseInt(parseError.message.match(/position (\d+)/)[1]);
          const start = Math.max(0, pos - 100);
          const end = Math.min(jsonStr.length, pos + 100);
          console.error('JSON around error position:', jsonStr.substring(start, end));
        }

        // Log the full JSON for manual inspection
        console.error('Full JSON content:', jsonStr);
        throw parseError;
      }
      console.log('✅ Successfully parsed sequencing JSON:', parsed);

      return parsed;
    } catch (error) {
      console.error('❌ CLAUDE SEQUENCING ERROR:', error.message);
      console.error('Full sequencing error:', error);
      throw error;
    }
  }

  getAnalysisPrompt(platform, tlAnalysis) {
    if (platform === 'instagram') {
      return this.getInstagramPrompt(tlAnalysis);
    } else {
      return this.getTikTokPrompt(tlAnalysis);
    }
  }

  getTikTokPrompt(tlAnalysis) {
    return `Analyze this long-form video advertisement for TikTok clipping potential using the Comprehensive 100-Point Scoring Framework.

IMPORTANT: This is landscape source content that will be adapted for TikTok. Score based on adaptability potential, not current format.

VIDEO DATA:
${JSON.stringify(tlAnalysis, null, 2)}

ANALYSIS REQUIREMENTS:
Base your scores on the actual TwelveLabs data provided above. Use these specific data points:
- Video metadata: duration, resolution, fps, file_size
- Visual analysis: scenes, shots, people detection, text_in_video, logos, motion
- Audio analysis: transcription, audio_quality, sounds_detected, music, voice_analysis
- Semantic analysis: topics, categories, sentiment, emotions, highlights
- Temporal analysis: pacing, opening, closing
- Context analysis: suitable_for, platform_fit, editing_notes

Apply the 5 Core Scoring Dimensions (100-point weighted scale):

1. HOOK QUALITY & FIRST IMPRESSION MOMENTS (25 points)
Evaluate attention-grabbing moments that can serve as TikTok hooks (users decide within 2-3 seconds):
- Strong Visual Hooks (8 points): Striking visuals, unexpected elements, dramatic reveals, "WTF" moments
- Verbal Hook Strength (8 points): Compelling opening statements, questions, bold claims, suspenseful teasers
- Multiple Hook Opportunities (5 points): 3+ distinct moments that could serve as standalone hooks
- Emotional Triggers (4 points): Content evoking surprise, excitement, curiosity, strong emotional responses

2. CONTENT MODULARITY & SEGMENTATION POTENTIAL (20 points)
Assess how easily content can be broken into coherent, standalone short-form pieces:
- Natural Break Points (6 points): Clear transitions, topic shifts, narrative segments for clean cuts
- Self-Contained Moments (6 points): Segments that tell complete mini-stories without full context
- Sequence Independence (4 points): Individual segments working standalone while maintaining impact
- Density of Clippable Content (4 points): High ratio of usable moments relative to total video length

3. TIKTOK-SPECIFIC OPTIMIZATION ELEMENTS (20 points)
Evaluate alignment with TikTok's algorithm preferences and platform best practices:
- Vertical Format Adaptability (5 points): Key visual elements positioned for 9:16 aspect ratio cropping
- Trending Audio/Music Integration (5 points): Use of or potential to overlay trending sounds
- Text Overlay Potential (4 points): Visual space and content structure suitable for captions
- Platform Feature Compatibility (3 points): Content suitable for TikTok effects, filters, interactive features
- Search Optimization Elements (3 points): Content aligning with trending keywords and searchable topics

4. ENGAGEMENT & RETENTION FACTORS (20 points)
Measure elements that drive viewer retention and engagement for algorithm favorability:
- Pacing and Energy (6 points): Dynamic pacing, quick cuts, energy levels matching short-form preferences
- Watch Time Optimization (5 points): Content density encouraging full viewing of 15-60 second clips
- Interactive Elements (4 points): Elements encouraging comments, shares, user-generated responses
- Completion Rate Potential (5 points): Content structure encouraging viewers to watch clips entirely

5. VIRAL POTENTIAL & SHAREABILITY (15 points)
Assess likelihood of clipped content achieving viral reach and social sharing:
- Trend Alignment (4 points): Content aligning with current or emerging TikTok trends and challenges
- Relatability Factors (4 points): Universal experiences, problems, emotions that resonate broadly
- Shareability Elements (4 points): Surprising, funny, remarkable moments encouraging sharing
- Meme Potential (3 points): Content that could inspire user-generated content or meme creation

Calculate TOTAL SCORE: Sum all dimension scores (max 100 points)

SCORE INTERPRETATION:
90-100: Exceptional clipping potential - Multiple high-performing clips with minimal optimization
75-89: High potential - Strong foundation with some optimization needed
60-74: Moderate potential - Reasonable opportunities requiring strategic enhancement
45-59: Limited potential - Significant reworking needed
Below 45: Poor fit - Content fundamentally incompatible with short-form optimization

Provide specific timestamps for top clip opportunities, dimension scores, strategic recommendations, and detailed analysis for TikTok optimization.

For top scoring segments, identify specific clip opportunities with timestamps and provide strategic recommendations.

Return JSON only:
{
  "hook_quality_first_impression": number,
  "content_modularity_segmentation": number,
  "tiktok_specific_optimization": number,
  "engagement_retention_factors": number,
  "viral_potential_shareability": number,
  "total_score": number,
  "score_interpretation": "Exceptional/High/Moderate/Limited/Poor",
  "overall_grade": "A/B/C/D/F",
  "key_insights": [
    "3-5 bullet points about specific strengths and optimization opportunities"
  ],
  "clip_opportunities": {
    "primary_clips": [
      {
        "timestamp": "MM:SS-MM:SS",
        "hook_type": "visual/verbal/emotional/curiosity/pattern-interrupt",
        "hook_score": number,
        "modularity_score": number,
        "viral_potential": number,
        "optimization_notes": "specific recommendations"
      }
    ],
    "secondary_clips": [
      {
        "timestamp": "MM:SS-MM:SS",
        "potential_score": number,
        "enhancement_required": "description of needed optimization"
      }
    ]
  },
  "strategic_recommendations": {
    "high_scoring_content": "recommendations for 75+ scoring content",
    "medium_scoring_content": "recommendations for 60-74 scoring content",
    "optimization_priorities": ["ranked list of improvement areas"],
    "resource_allocation": "guidance on where to focus efforts"
  },
  "extraction_analysis": {
    "strong_segments": [
      {
        "timestamp": "MM:SS-MM:SS",
        "hook_score": "X.X/25",
        "modularity_score": "X.X/20",
        "optimization_score": "X.X/20",
        "engagement_score": "X.X/20",
        "viral_score": "X.X/15",
        "total_score": "XX/100 TikTok Optimization Score",
        "strategic_notes": "Brief optimization recommendations for this segment"
      }
    ],
    "recommended_sequence": ["timestamp_order"],
    "platform_optimization_notes": ["specific TikTok-focused technical recommendations"]
  },
  "watch_time_optimization": {
    "predicted_completion_rate": "number (0-100%, based on pacing analysis and content density - fast pacing + high hook strength = higher rates)",
    "predicted_engagement_rate": "number (0-100%, based on people presence, motion, and emotional content from semantic analysis)",
    "rewatch_potential": "string (high/medium/low, based on highlights count and viral potential from semantic analysis)",
    "attention_retention_factors": ["list of specific elements that keep TikTok viewers watching"]
  },
  "tiktok_optimizations": {
    "face_frequency_score": "number (0-10, based on people detection data - score 8-10 if faces present in 60%+ of scenes, 5-7 if 30-60%, 0-4 if <30%)",
    "central_action_percentage": "number (0-100, analyze motion and people positioning to estimate % of key action in center 60% of frame for 9:16 crop)",
    "visual_variety_score": "number (0-10, based on scenes/shots count and visual motion data - more scene changes and motion = higher score)",
    "cover_frame_recommendation": "MM:SS timestamp (choose moment with highest hook potential or visual impact for TikTok thumbnail)",
    "trending_audio_potential": "string (high/medium/low, based on audio analysis and music presence)",
    "text_overlay_compatibility": "number (0-10, based on visual space and composition for TikTok text overlays)"
  },
  "platform_optimization": {
    "vertical_format_score": "number (0-10, based on video resolution, composition, and center-frame activity from TwelveLabs analysis)",
    "trending_audio_compatibility": "number (0-10, based on audio quality, music presence, and audio characteristics from metadata)",
    "text_overlay_opportunities": "number (0-10, based on visual space, text detection, and composition analysis)",
    "algorithm_favorability": "number (0-10, based on pacing, engagement factors, and platform-specific elements)"
  }
}`;
  }

  getInstagramPrompt(tlAnalysis) {
    return `Analyze this long-form video advertisement for Instagram Reels clipping potential using the Comprehensive 100-Point Scoring Framework for Instagram Reels.

Based on extensive research into Instagram's 2025 algorithm updates, Reels-specific optimization factors, and platform-unique engagement patterns, evaluate this video for its potential to be resequenced into high-performing Instagram Reels content.

VIDEO DATA:
${JSON.stringify(tlAnalysis, null, 2)}

ANALYSIS REQUIREMENTS:
Base your scores on the actual TwelveLabs data provided above. Use these specific data points:
- Video metadata: duration, resolution, fps, file_size for quality assessment
- Visual analysis: scenes, shots, people detection, text_in_video, logos, motion for composition scoring
- Audio analysis: transcription, audio_quality, sounds_detected, music, voice_analysis for audio evaluation
- Semantic analysis: topics, categories, sentiment, emotions, highlights for content assessment
- Temporal analysis: pacing, opening, closing for engagement evaluation
- Context analysis: suitable_for, platform_fit, editing_notes for optimization potential

Apply the 5 Core Scoring Dimensions (100-point weighted scale):

1. VISUAL QUALITY & INSTAGRAM AESTHETIC ALIGNMENT (25 points)
Instagram's algorithm and user base prioritize high-quality, visually polished content that aligns with the platform's sophisticated aesthetic standards.

Evaluation Criteria:
- Production Quality (8 points): Professional lighting, clear audio, high resolution (minimum 1080p), and stable footage suitable for Instagram's quality standards
- Visual Composition (7 points): Strong visual hierarchy, appealing color palettes, and composition that works effectively in 9:16 vertical format
- Brand Integration (5 points): Seamless incorporation of brand elements, logos, and visual identity that feels native to Instagram content
- Aesthetic Consistency (5 points): Visual style that aligns with Instagram's polished, aspirational content expectations

2. RELATIONSHIP-BUILDING & COMMUNITY ENGAGEMENT POTENTIAL (20 points)
Instagram's 2025 algorithm heavily weighs relationship-based signals and content that fosters meaningful community interactions.

Evaluation Criteria:
- Conversation Starters (6 points): Content elements that naturally encourage meaningful comments and discussions rather than passive consumption
- Behind-the-Scenes Value (5 points): Authentic moments that build personal connection and trust with viewers
- Community-Centric Messaging (5 points): Content that speaks to shared experiences, values, or interests within specific communities
- User-Generated Content Potential (4 points): Elements that could inspire followers to create related content or participate in brand conversations

3. INSTAGRAM ALGORITHM OPTIMIZATION FACTORS (20 points)
This evaluates alignment with Instagram's specific ranking factors: watch time, likes per reach, and sends per reach.

Evaluation Criteria:
- Watch Time Optimization (8 points): Content density and pacing designed to maximize average watch time and completion rates
- Native Instagram Features (4 points): Compatibility with Instagram's creative tools, stickers, effects, and interactive elements
- Original Content Markers (4 points): Unique elements that avoid Instagram's penalties for reposted content and watermarks
- Cross-Platform Integration (4 points): Content that leverages Instagram's connection to Facebook and other Meta platforms

4. AUDIENCE RETENTION & ENGAGEMENT DEPTH (20 points)
Instagram rewards content that generates deep, meaningful engagement rather than surface-level interactions.

Evaluation Criteria:
- Completion Rate Potential (6 points): Content structure that encourages full viewing of 15-90 second clips
- Replay Value (5 points): Elements that encourage multiple viewings, increasing total watch time
- Save-Worthy Content (5 points): Educational, inspirational, or reference value that motivates users to save for later
- Share Motivation (4 points): Content compelling enough to share with friends, crucial for unconnected reach

5. DISCOVERY & GROWTH POTENTIAL (15 points)
This assesses the content's ability to attract new followers and expand reach beyond existing audiences.

Evaluation Criteria:
- Follower Conversion Elements (5 points): Content quality and value that convinces viewers to follow for more
- Explore Page Potential (4 points): Trending topics, hashtag alignment, and content that could surface in Instagram's Explore section
- Niche Authority Signals (3 points): Content that positions the brand as an expert or thought leader in their space
- Viral Catalyst Moments (3 points): Unique, shareable moments that could drive organic amplification

SCORE INTERPRETATION:
90-100: Exceptional Instagram potential - Ready for immediate Reels deployment with high performance likelihood
75-89: Strong Instagram fit - Good foundation requiring minor optimization
60-74: Moderate potential - Needs strategic enhancement for optimal performance
45-59: Limited Instagram compatibility - Requires significant reworking
Below 45: Poor Instagram fit - Consider alternative platforms or complete content restructuring

Provide specific timestamps for top clip opportunities, dimension scores, strategic recommendations, and detailed analysis for Instagram Reels optimization.

IMPORTANT SCORING CONSTRAINTS:
- All dimension scores must be within their specified ranges (25, 20, 20, 20, 15)
- Instagram optimization scores: face_frequency_score (0-10), visual_variety_score (0-10), quality_after_crop (0-10)
- central_action_percentage must be 0-100 (percentage)
- Never exceed maximum values for any metric

Return JSON only:
{
  "visual_quality_aesthetic": number,
  "relationship_community_engagement": number,
  "instagram_algorithm_optimization": number,
  "audience_retention_engagement": number,
  "discovery_growth_potential": number,
  "total_score": number,
  "overall_grade": "A/B/C/D/F",
  "key_insights": [
    "4-5 bullet points about Instagram Reels-specific strengths and strategic recommendations"
  ],
  "extraction_analysis": {
    "strong_segments": [
      {
        "timestamp": "MM:SS-MM:SS",
        "visual_quality_score": "X.X/25",
        "relationship_score": "X.X/20",
        "algorithm_score": "X.X/20",
        "retention_score": "X.X/20",
        "discovery_score": "X.X/15",
        "total_score": "XX/100 Instagram Optimization Score",
        "strategic_notes": "Brief optimization recommendations for this segment"
      }
    ],
    "recommended_sequence": ["timestamp_order"],
    "visual_optimization_notes": ["specific technical recommendations"]
  },
  "watch_time_optimization": {
    "predicted_completion_rate": "number (0-100%, based on pacing analysis and content density - fast pacing + high emotion = higher rates)",
    "predicted_engagement_rate": "number (0-100%, based on people presence, motion, and emotional content from semantic analysis)",
    "visual_momentum_score": "number (0-10, based on motion analysis and scene change frequency - higher motion/cuts = higher score)",
    "rewatch_potential": "string (high/medium/low, based on highlights count and emotional peaks from semantic analysis)"
  },
  "instagram_optimizations": {
    "face_frequency_score": "number (0-10, based on people detection data - score 8-10 if faces present in 60%+ of scenes, 5-7 if 30-60%, 0-4 if <30%)",
    "central_action_percentage": "number (0-100, analyze motion and people positioning to estimate % of key action in center 60% of frame)",
    "visual_variety_score": "number (0-10, based on scenes/shots count and visual motion data - more scene changes and motion = higher score)",
    "quality_after_crop": "number (0-10, based on resolution and fps data - 1080p+ and 30fps+ = 8-10, 720p = 5-7, lower = 0-4)",
    "subtitle_requirements": ["timestamp ranges where transcription shows important dialogue or no audio detected"],
    "cover_frame_recommendation": "MM:SS timestamp (choose moment with highest people detection score or visual impact)"
  }
}`;
  }
}

module.exports = ClaudeService;