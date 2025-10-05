import React from 'react';
import { Mic, Music, Volume2 } from 'lucide-react';

const SoundtrackToggle = ({ audioSettings, onChange }) => {
  const toggleOption = (option) => {
    onChange({
      ...audioSettings,
      [option]: !audioSettings[option]
    });
  };

  const options = [
    {
      key: 'voiceover',
      label: 'Voiceover',
      icon: Mic,
      description: 'AI-generated narration from script'
    },
    {
      key: 'music',
      label: 'Background Music',
      icon: Music,
      description: 'Mood-based background music'
    },
    {
      key: 'sfx',
      label: 'Sound Effects',
      icon: Volume2,
      description: 'Transition and scene sounds'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 mb-3">Audio Generation Options:</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map(({ key, label, icon: Icon, description }) => (
          <div key={key} className="relative">
            <button
              onClick={() => toggleOption(key)}
              className={`
                w-full flex flex-col items-center p-4 rounded-lg border-2 transition-all
                ${audioSettings[key]
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }
              `}
            >
              <Icon className="h-6 w-6 mb-2" />
              <div className="font-medium text-sm mb-1">{label}</div>
              <div className="text-xs text-center opacity-75">{description}</div>
            </button>
            {audioSettings[key] && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Selected: </span>
          {Object.entries(audioSettings)
            .filter(([_, enabled]) => enabled)
            .map(([key, _]) => options.find(opt => opt.key === key)?.label)
            .join(', ') || 'None'}
        </div>
      </div>
    </div>
  );
};

export default SoundtrackToggle;