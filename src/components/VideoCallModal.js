"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdCallEnd } from 'react-icons/md';
import { FaUsers, FaTimes } from 'react-icons/fa';

// Memoized video component to prevent unnecessary re-renders
const MemoizedVideoElement = memo(({ 
  participant, 
  setVideoRef, 
  isAudioMuted,
  className = "",
  style = {}
}) => {
  console.log(`🎬 Rendering video element for ${participant.session_id} (local: ${participant.local})`);
  
  return (
    <video
      key={`${participant.session_id}-main`}
      ref={el => setVideoRef(el, participant.session_id)}
      autoPlay
      playsInline
      muted={participant.local} // Only mute local participant to prevent echo
      className={className}
      style={style}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if video-related props change
  const videoPropsChanged = 
    prevProps.participant.session_id !== nextProps.participant.session_id ||
    prevProps.participant.video !== nextProps.participant.video ||
    prevProps.participant.videoTrack?.id !== nextProps.participant.videoTrack?.id ||
    prevProps.participant.local !== nextProps.participant.local;
  
  if (!videoPropsChanged) {
    console.log(`🚫 Preventing re-render of video element for ${prevProps.participant.session_id}`);
  }
  
  return !videoPropsChanged; // Return true to prevent re-render
});

MemoizedVideoElement.displayName = 'MemoizedVideoElement';

// Memoized participant card to prevent unnecessary re-renders
const MemoizedParticipantCard = memo(({ 
  participant, 
  setVideoRef, 
  isAudioMuted, 
  isGrid = false 
}) => {
  console.log(`🃏 Rendering participant card for ${participant.session_id} (local: ${participant.local})`);
  
  const cardClass = isGrid 
    ? "relative bg-black overflow-hidden"
    : "relative bg-black overflow-hidden flex-1 min-w-0";
  
  const videoClass = "w-full h-full object-cover";
  const nameClass = isGrid 
    ? "absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-full"
    : "absolute bottom-1 left-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs";
  
  const avatarSize = isGrid ? "w-16 h-16" : "w-8 h-8";
  const avatarTextSize = isGrid ? "text-2xl" : "text-sm";
  
  const muteIconClass = isGrid 
    ? "absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full"
    : "absolute top-1 right-1 bg-red-500 text-white p-1 rounded";
  
  const muteIconSize = isGrid ? "w-4 h-4" : "w-3 h-3";
  
  return (
    <div className={cardClass}>
      <MemoizedVideoElement
        participant={participant}
        setVideoRef={setVideoRef}
        isAudioMuted={isAudioMuted}
        className={videoClass}
      />
      {!participant.video && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 border-gray-300">
          <div className={`${avatarSize} bg-gray-700 rounded-full flex items-center justify-center text-white ${avatarTextSize} font-semibold`}>
            {(participant.user_name || 'U')[0].toUpperCase()}
          </div>
        </div>
      )}
      <div className={nameClass}>
        {participant.local ? 'You' : (participant.user_name || 'Unknown')}
      </div>
      {isAudioMuted && (
        <div className={muteIconClass}>
          <MdMicOff className={muteIconSize} />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if video state or audio mute state changes
  const shouldRerender = 
    prevProps.participant.session_id !== nextProps.participant.session_id ||
    prevProps.participant.video !== nextProps.participant.video ||
    prevProps.participant.videoTrack?.id !== nextProps.participant.videoTrack?.id ||
    prevProps.participant.user_name !== nextProps.participant.user_name ||
    prevProps.participant.local !== nextProps.participant.local ||
    prevProps.isAudioMuted !== nextProps.isAudioMuted ||
    prevProps.isGrid !== nextProps.isGrid;
  
  if (!shouldRerender) {
    console.log(`🚫 Preventing re-render of participant card for ${prevProps.participant.session_id}`);
  }
  
  return !shouldRerender;
});

MemoizedParticipantCard.displayName = 'MemoizedParticipantCard';

export function VideoCallModal({ isOpen, onClose, roomUrl, chatId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callObject, setCallObject] = useState(null);
  const [participants, setParticipants] = useState({});
  const [participantAudioStates, setParticipantAudioStates] = useState({});
  const [localParticipant, setLocalParticipant] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingState, setMeetingState] = useState('new');
  const [forceUpdate, setForceUpdate] = useState(0);

  const modalRef = useRef(null);
  const videoRefs = useRef({});
  const audioRefs = useRef({}); // Add audio refs
  const streamUpdateTimeouts = useRef({});
  const [lastVideoStates, setLastVideoStates] = useState({});

  // Track video state changes to prevent unnecessary updates
  const hasVideoStateChanged = useCallback((participant) => {
    const sessionId = participant.session_id;
    const currentVideoState = {
      video: participant.video,
      hasVideoTrack: !!participant.videoTrack,
      videoTrackId: participant.videoTrack?.id
    };
    
    const lastState = lastVideoStates[sessionId];
    const hasChanged = !lastState || 
      lastState.video !== currentVideoState.video ||
      lastState.hasVideoTrack !== currentVideoState.hasVideoTrack ||
      lastState.videoTrackId !== currentVideoState.videoTrackId;
    
    if (hasChanged) {
      setLastVideoStates(prev => ({
        ...prev,
        [sessionId]: currentVideoState
      }));
    }
    
    return hasChanged;
  }, [lastVideoStates]);

  // Function to get real-time media state from Daily (single source of truth)
  const getCurrentMediaState = () => {
    if (!callObject || meetingState !== 'joined') {
      return { isMuted: true, isCameraOff: true };
    }
    
    const currentLocal = callObject.participants()?.local;
    return {
      isMuted: currentLocal ? !currentLocal.audio : true,
      isCameraOff: currentLocal ? !currentLocal.video : true
    };
  };

  // Enhanced audio element ref setter
  const setAudioRef = useCallback((element, sessionId) => {
    const refKey = `audio-${sessionId}`;
    
    if (element) {
      console.log(`Setting audio ref for ${sessionId}`);
      audioRefs.current[refKey] = element;
      
      // Immediately try to set up audio if we have the participant data
      if (callObject && meetingState === 'joined') {
        const setupAudio = (attempt = 1) => {
          setTimeout(() => {
            const currentParticipants = callObject.participants();
            const participant = currentParticipants[sessionId];
            
            if (participant && participant.audioTrack && !participant.local && element.parentNode) {
              try {
                const audioStream = new MediaStream([participant.audioTrack]);
                element.srcObject = audioStream;
                
                element.play().then(() => {
                  console.log(`Audio playing for ${sessionId}`);
                }).catch(err => {
                  console.warn(`Audio play failed for ${sessionId}:`, err);
                  if (attempt < 3) setupAudio(attempt + 1);
                });
              } catch (err) {
                console.warn(`Error setting up audio for ${sessionId}:`, err);
                if (attempt < 3) setupAudio(attempt + 1);
              }
            } else if (attempt < 3 && participant) {
              setupAudio(attempt + 1);
            }
          }, attempt * 100);
        };
        
        setupAudio();
      }
    } else {
      console.log(`Removing audio ref for ${sessionId}`);
      delete audioRefs.current[refKey];
    }
  }, [callObject, meetingState]);

  // Enhanced video stream update function with audio handling
  const updateVideoStreams = useCallback((participantsToUpdate) => {
    if (!callObject) {
      console.log('No call object, skipping stream update');
      return;
    }

    const currentParticipants = callObject.participants();
    console.log('Updating streams for participants:', Object.keys(currentParticipants));
    
    Object.values(currentParticipants).forEach(participant => {
      const sessionId = participant.session_id;
      console.log(`Processing participant ${sessionId}:`, {
        hasVideo: participant.video,
        hasVideoTrack: !!participant.videoTrack,
        hasAudio: participant.audio,
        hasAudioTrack: !!participant.audioTrack,
        isLocal: participant.local
      });
      
      // Clear any pending timeout for this participant
      if (streamUpdateTimeouts.current[sessionId]) {
        clearTimeout(streamUpdateTimeouts.current[sessionId]);
      }

      // Handle regular video stream - INCLUDING LOCAL PARTICIPANT
      const videoElement = videoRefs.current[sessionId];
      if (videoElement) {
        if (participant.videoTrack && participant.video) {
          try {
            const newStream = new MediaStream([participant.videoTrack]);
            
            // Only update video streams if the video track actually changed
            // Don't update for audio-only changes to prevent flickering
            const shouldUpdate = !videoElement.srcObject || 
                               videoElement.srcObject.getTracks()[0]?.id !== participant.videoTrack.id;
            
            if (shouldUpdate) {
              console.log(`Setting video stream for ${sessionId} (local: ${participant.local}) - track changed`);
              
              // Immediate assignment for local participants, slight delay for remote
              const delay = participant.local ? 10 : 50;
              
              streamUpdateTimeouts.current[sessionId] = setTimeout(() => {
                if (videoElement && participant.videoTrack && videoElement.parentNode) {
                  try {
                    videoElement.srcObject = newStream;
                    
                    // For local participants, ensure autoplay works
                    if (participant.local) {
                      videoElement.muted = true; // Ensure local video is muted to prevent echo
                      videoElement.playsInline = true;
                      videoElement.autoplay = true;
                    }
                    
                    videoElement.play().then(() => {
                      console.log(`✅ Video playing for ${sessionId} (local: ${participant.local})`);
                    }).catch(err => {
                      console.warn(`❌ Video play failed for ${sessionId}:`, err);
                      
                      // Retry for local participants
                      if (participant.local) {
                        setTimeout(() => {
                          videoElement.play().catch(console.warn);
                        }, 200);
                      }
                    });
                  } catch (streamErr) {
                    console.warn(`Error assigning stream to ${sessionId}:`, streamErr);
                  }
                }
              }, delay);
            } else {
              console.log(`Skipping video update for ${sessionId} - same track (prevents flicker)`);
            }
          } catch (err) {
            console.warn('Error creating video stream:', err);
            // Retry logic with exponential backoff
            streamUpdateTimeouts.current[sessionId] = setTimeout(() => {
              updateVideoStreams({ [sessionId]: participant });
            }, participant.local ? 100 : 200);
          }
        } else {
          console.log(`Clearing video for ${sessionId} (no track or video off)`);
          if (videoElement.srcObject) {
            videoElement.srcObject = null;
          }
        }
      } else {
        console.log(`⚠️ No video element found for ${sessionId} - may need DOM update`);
      }

      // Handle audio stream for remote participants ONLY
      if (!participant.local && participant.audioTrack) {
        const audioElement = audioRefs.current[`audio-${sessionId}`];
        if (audioElement) {
          try {
            const audioStream = new MediaStream([participant.audioTrack]);
            
            if (!audioElement.srcObject || 
                audioElement.srcObject.getTracks()[0]?.id !== participant.audioTrack.id) {
              
              console.log(`Setting audio stream for ${sessionId}`);
              audioElement.srcObject = audioStream;
              
              audioElement.play().then(() => {
                console.log(`Audio playing for ${sessionId}`);
              }).catch(err => {
                console.warn(`Audio play failed for ${sessionId}:`, err);
              });
            }
          } catch (err) {
            console.warn(`Error setting up audio for ${sessionId}:`, err);
          }
        }
      }
    });
  }, []);

  // Function to sync React state with Daily's actual state
  const syncStateWithDaily = useCallback(() => {
    if (callObject && meetingState === 'joined') {
      const allParticipants = callObject.participants();
      const local = allParticipants.local;
      
      if (local) {
        setLocalParticipant(local);
        setParticipants(allParticipants);
        updateVideoStreams(allParticipants);
      }
    }
  }, [callObject, meetingState, updateVideoStreams]);

  // Check audio permissions
  const checkAudioPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('Audio permissions granted');
      return true;
    } catch (err) {
      console.error('Audio permissions denied:', err);
      setError('Microphone access is required for audio calls');
      return false;
    }
  };

  useEffect(() => {
    if (!isOpen || !roomUrl) {
      // Cleanup when modal closes
      if (callObject) {
        try {
          // Clear all pending timeouts
          Object.values(streamUpdateTimeouts.current).forEach(timeout => {
            if (timeout) clearTimeout(timeout);
          });
          streamUpdateTimeouts.current = {};
          
          // Clean up audio elements managed by React only
          const audioElements = document.querySelectorAll('audio[data-participant]');
          audioElements.forEach(element => {
            // Only remove if it was manually created (has data-participant but no React ref)
            const sessionId = element.dataset.participant;
            if (!audioRefs.current[`audio-${sessionId}`]) {
              element.remove();
            }
          });
          
          callObject.leave();
          callObject.destroy();
        } catch (err) {
          console.warn('Error during cleanup:', err);
        }
        setCallObject(null);
        setParticipants({});
        setParticipantAudioStates({});
        setLocalParticipant(null);
        setIsLoading(true);
        setError(null);
        setMeetingState('new');
        videoRefs.current = {};
        audioRefs.current = {};
        setLastVideoStates({}); // Clear video state tracking
      }
      return;
    }

    // Prevent duplicate initialization
    if (callObject) {
      console.log('Call object already exists, skipping initialization');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMeetingState('loading');

    // Check if Daily is already loaded
    if (window.DailyIframe) {
      initializeCall();
    } else {
      // Load Daily.co script
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.async = true;
      script.onload = initializeCall;
      script.onerror = () => {
        setError('Failed to load Daily.co SDK');
        setIsLoading(false);
        setMeetingState('error');
      };
      document.head.appendChild(script);
    }

    async function initializeCall() {
      try {
        if (!window.DailyIframe) {
          throw new Error('Daily.co SDK not loaded');
        }

        // Check audio permissions first
        const hasAudioPermission = await checkAudioPermissions();
        if (!hasAudioPermission) {
          return;
        }

        // Check if we already have a call object to prevent duplicates
        if (callObject) {
          console.log('Call object already exists, not creating new one');
          return;
        }

        // Create call object for custom UI (not prebuilt)
        const daily = window.DailyIframe.createCallObject();

        // Set up comprehensive event listeners
        daily
          .on('loading', () => {
            console.log('Daily loading');
            setMeetingState('loading');
          })
          .on('loaded', () => {
            console.log('Daily loaded');
            setMeetingState('loaded');
          })
          .on('joined-meeting', async (event) => {
            console.log('Joined meeting', event);
            const allParticipants = daily.participants();
            console.log('All participants on join:', Object.keys(allParticipants));
            
            // Initialize both participants and audio states
            setParticipants(allParticipants);
            
            // Initialize audio states for all participants
            const audioStates = {};
            Object.values(allParticipants).forEach(p => {
              audioStates[p.session_id] = p.audio;
            });
            setParticipantAudioStates(audioStates);
            
            setLocalParticipant(allParticipants.local);
            setMeetingState('joined');
            setIsLoading(false);

            // Force a re-render to ensure video elements are created
            setForceUpdate(prev => prev + 1);

            // Multiple attempts to set up streams
            setTimeout(() => {
              console.log('First attempt: Updating streams after join');
              const freshParticipants = daily.participants();
              updateVideoStreams(freshParticipants);
            }, 100);

            setTimeout(() => {
              console.log('Second attempt: Updating streams after DOM ready');
              const freshParticipants = daily.participants();
              updateVideoStreams(freshParticipants);
            }, 500);

            setTimeout(() => {
              console.log('Final attempt: Updating streams');
              const freshParticipants = daily.participants();
              updateVideoStreams(freshParticipants);
              setForceUpdate(prev => prev + 1);
            }, 1000);
          })
          .on('participant-joined', (event) => {
            console.log('Participant joined', event.participant.session_id);
            
            const allParticipants = daily.participants();
            console.log('All participants after new join:', Object.keys(allParticipants));
            
            // Update participants state immediately
            setParticipants(allParticipants);
            
            // Add the new participant to audio states
            setParticipantAudioStates(prevAudio => {
              const newAudioStates = { ...prevAudio };
              newAudioStates[event.participant.session_id] = event.participant.audio;
              return newAudioStates;
            });
            
            setForceUpdate(prev => prev + 1);
            
            // Multiple attempts to set up streams for new participant
            setTimeout(() => {
              console.log('First attempt: Setting up streams for new participant');
              const freshParticipants = daily.participants();
              updateVideoStreams(freshParticipants);
            }, 200);

            setTimeout(() => {
              console.log('Second attempt: Setting up streams for new participant');
              const freshParticipants = daily.participants();
              updateVideoStreams(freshParticipants);
            }, 600);

            setTimeout(() => {
              console.log('Final attempt: Setting up streams for new participant');
              const freshParticipants = daily.participants();
              updateVideoStreams(freshParticipants);
              setForceUpdate(prev => prev + 1);
            }, 1200);
          })
          .on('participant-left', (event) => {
            console.log('Participant left', event.participant.session_id);
            
            // Get fresh participants list AFTER the participant has left
            const allParticipants = daily.participants();
            console.log('All participants after someone left:', Object.keys(allParticipants));
            
            // CRITICAL: Update participants state immediately to trigger re-render
            setParticipants(allParticipants);
            
            // Also update audio states to remove the left participant
            setParticipantAudioStates(prevAudio => {
              const newAudioStates = { ...prevAudio };
              delete newAudioStates[event.participant.session_id];
              return newAudioStates;
            });

            // Clean up refs and timeouts for left participant
            const sessionId = event.participant.session_id;
            console.log(`🧹 Cleaning up refs for departed participant ${sessionId}`);
            
            // Clean up timeouts
            if (streamUpdateTimeouts.current[sessionId]) {
              clearTimeout(streamUpdateTimeouts.current[sessionId]);
              delete streamUpdateTimeouts.current[sessionId];
            }

            // Clean up video refs
            if (videoRefs.current[sessionId]) {
              console.log(`🗑️ Removing video ref for ${sessionId}`);
              const videoElement = videoRefs.current[sessionId];
              if (videoElement && videoElement.srcObject) {
                videoElement.srcObject = null;
              }
              delete videoRefs.current[sessionId];
            }

            // Clean up audio refs
            if (audioRefs.current[`audio-${sessionId}`]) {
              console.log(`🗑️ Removing audio ref for ${sessionId}`);
              const audioElement = audioRefs.current[`audio-${sessionId}`];
              if (audioElement && audioElement.srcObject) {
                audioElement.srcObject = null;
              }
              delete audioRefs.current[`audio-${sessionId}`];
            }

            // Clean up video state tracking
            setLastVideoStates(prevStates => {
              const newStates = { ...prevStates };
              delete newStates[sessionId];
              return newStates;
            });

            // Force a re-render to update the UI immediately
            setForceUpdate(prev => prev + 1);

            // Small delay to ensure DOM cleanup, then update streams for remaining participants
            setTimeout(() => {
              console.log('🔄 Updating streams after participant left - remaining participants:', Object.keys(allParticipants));
              updateVideoStreams(allParticipants);
            }, 100);
          })
          .on('participant-updated', (event) => {
            console.log('Participant updated', event.participant.session_id, 'audio:', event.participant.audio, 'video:', event.participant.video);
            
            const allParticipants = daily.participants();
            
            // CRITICAL: Create completely separate audio state object to prevent re-renders
            setParticipantAudioStates(prevAudio => {
              const newAudioStates = { ...prevAudio };
              newAudioStates[event.participant.session_id] = event.participant.audio;
              return newAudioStates;
            });

            if (event.participant.local) {
              setLocalParticipant(event.participant);
              
              // Check if video state actually changed for local participant
              const videoChanged = hasVideoStateChanged(event.participant);
              
              if (videoChanged) {
                console.log('📹 Local video state changed - updating video streams');
                
                // Only update participants state when video changes
                setParticipants(allParticipants);
                setForceUpdate(prev => prev + 1);
                
                if (event.participant.video && event.participant.videoTrack) {
                  setTimeout(() => {
                    const localVideoElement = videoRefs.current[event.participant.session_id];
                    if (localVideoElement) {
                      try {
                        const stream = new MediaStream([event.participant.videoTrack]);
                        localVideoElement.srcObject = stream;
                        localVideoElement.muted = true;
                        localVideoElement.play().then(() => {
                          console.log('✅ Local video updated successfully');
                        }).catch(err => {
                          console.warn('❌ Local video update failed:', err);
                        });
                      } catch (err) {
                        console.warn('Error updating local video:', err);
                      }
                    }
                  }, 100);
                }
                
                setTimeout(() => {
                  console.log('🔄 Updating streams for video state change');
                  const freshParticipants = daily.participants();
                  updateVideoStreams(freshParticipants);
                }, 150);
              } else {
                console.log('🎤 Audio-only change detected - ZERO video updates');
              }
            } else {
              // For remote participants, check if their video state changed
              const videoChanged = hasVideoStateChanged(event.participant);
              
              if (videoChanged) {
                console.log('📹 Remote participant video state changed');
                setParticipants(allParticipants);
                setForceUpdate(prev => prev + 1);
                setTimeout(() => {
                  console.log('🔄 Updating streams for remote participant video change');
                  const freshParticipants = daily.participants();
                  updateVideoStreams(freshParticipants);
                }, 150);
              } else {
                console.log('🎤 Remote participant audio-only change - ZERO video updates');
              }
            }
          })
          .on('track-started', (event) => {
            console.log('Track started', event);
            
            setForceUpdate(prev => prev + 1);
            
            // Handle audio tracks specifically
            if (event.track && event.track.kind === 'audio' && !event.participant.local) {
              console.log('Audio track started for remote participant');
              // Let React handle audio elements - don't create manually
              setTimeout(() => {
                updateVideoStreams(daily.participants());
              }, 200);
            }
            
            setTimeout(() => {
              console.log('Updating streams for track started');
              updateVideoStreams(daily.participants());
            }, 400);
            
            setTimeout(() => {
              console.log('Second attempt for track started');
              updateVideoStreams(daily.participants());
            }, 800);
          })
          .on('track-stopped', (event) => {
            console.log('Track stopped', event);
            setTimeout(() => {
              updateVideoStreams(daily.participants());
            }, 100);
          })
          .on('error', (event) => {
            console.error('Daily error', event);
            setError(event.errorMsg || 'An error occurred during the call');
            setIsLoading(false);
            setMeetingState('error');
          })
          .on('left-meeting', () => {
            console.log('Left meeting');
            setParticipants({});
            setLocalParticipant(null);
            setMeetingState('left');
            
            // Clean up all timeouts, refs, and audio elements
            Object.values(streamUpdateTimeouts.current).forEach(timeout => {
              if (timeout) clearTimeout(timeout);
            });
            streamUpdateTimeouts.current = {};
            videoRefs.current = {};
            audioRefs.current = {};
            
            // Only clean up manually created audio elements, not React-managed ones
            const audioElements = document.querySelectorAll('audio[data-participant]');
            audioElements.forEach(element => {
              const sessionId = element.dataset.participant;
              if (!audioRefs.current[`audio-${sessionId}`]) {
                element.remove();
              }
            });
          })
          .on('camera-error', (event) => {
            console.error('Camera error', event);
            setError('Camera access denied or unavailable');
          })
          .on('microphone-error', (event) => {
            console.error('Microphone error', event);
            setError('Microphone access denied or unavailable');
          });

        setCallObject(daily);

        // Join the meeting with CAMERA OFF and audio ON
        await daily.join({
          url: roomUrl,
          startVideoOff: true,  // Start with camera OFF
          startAudioOff: true, // Start with audio ON
          userName: `Anon`
        });

      } catch (err) {
        console.error('Error initializing call:', err);
        setError(err.message || 'Failed to initialize video call');
        setIsLoading(false);
        setMeetingState('error');
      }
    }

    // Cleanup function
    return () => {
      if (callObject) {
        try {
          console.log('Cleaning up call object');
          Object.values(streamUpdateTimeouts.current).forEach(timeout => {
            if (timeout) clearTimeout(timeout);
          });
          streamUpdateTimeouts.current = {};
          
          const audioElements = document.querySelectorAll('audio[data-participant]');
          audioElements.forEach(element => element.remove());
          
          if (callObject.meetingState() !== 'left-meeting') {
            callObject.leave();
          }
          callObject.destroy();
        } catch (err) {
          console.warn('Error during cleanup:', err);
        }
        
        setCallObject(null);
        setParticipants({});
        setLocalParticipant(null);
        setIsLoading(true);
        setError(null);
        setMeetingState('new');
        videoRefs.current = {};
        audioRefs.current = {};
      }
    };
  }, [isOpen, roomUrl]);

  // Sync state with Daily periodically
  useEffect(() => {
    if (meetingState === 'joined' && callObject) {
      const interval = setInterval(syncStateWithDaily, 3000);
      return () => clearInterval(interval);
    }
  }, [meetingState, callObject, syncStateWithDaily]);

  // Enhanced toggle functions
  const toggleMute = async () => {
    if (!callObject || meetingState !== 'joined') return;
    
    try {
      const currentLocal = callObject.participants().local;
      if (!currentLocal) return;
      
      console.log(`🎤 Toggling mute from ${!currentLocal.audio} to ${currentLocal.audio} (audio-only change)`);
      
      await callObject.setLocalAudio(!currentLocal.audio);
      
      // Note: We intentionally DON'T call setForceUpdate or updateVideoStreams here
      // because mute/unmute is audio-only and shouldn't affect video rendering
      
    } catch (err) {
      console.error('Error toggling mute:', err);
      setError('Failed to toggle microphone');
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleCamera = async () => {
    if (!callObject || meetingState !== 'joined') return;
    
    try {
      const currentLocal = callObject.participants().local;
      if (!currentLocal) return;
      
      console.log(`🎥 Toggling camera from ${currentLocal.video} to ${!currentLocal.video}`);
      
      await callObject.setLocalVideo(!currentLocal.video);
      
      // Force immediate re-render
      setForceUpdate(prev => prev + 1);
      
      // Multiple attempts to ensure local video renders properly
      const retryVideoSetup = (attempt) => {
        setTimeout(() => {
          console.log(`🔄 Camera toggle retry attempt ${attempt}`);
          const allParticipants = callObject.participants();
          const localParticipant = allParticipants.local;
          
          if (localParticipant) {
            console.log(`Local participant state - video: ${localParticipant.video}, videoTrack: ${!!localParticipant.videoTrack}`);
            
            // Force update of local video specifically
            const localVideoElement = videoRefs.current[localParticipant.session_id];
            if (localVideoElement && localParticipant.video && localParticipant.videoTrack) {
              try {
                const stream = new MediaStream([localParticipant.videoTrack]);
                localVideoElement.srcObject = stream;
                localVideoElement.muted = true; // Prevent echo
                localVideoElement.play().then(() => {
                  console.log(`✅ Local video playing successfully on attempt ${attempt}`);
                }).catch(err => {
                  console.warn(`❌ Local video play failed on attempt ${attempt}:`, err);
                });
              } catch (err) {
                console.warn(`Error setting local video stream on attempt ${attempt}:`, err);
              }
            }
          }
          
          // Update all streams
          updateVideoStreams(allParticipants);
          
          // Force another re-render
          if (attempt <= 2) {
            setForceUpdate(prev => prev + 1);
          }
        }, attempt * 300);
      };
      
      // Try multiple times with increasing delays
      retryVideoSetup(1);
      retryVideoSetup(2);
      retryVideoSetup(3);
      
    } catch (err) {
      console.error('Error toggling camera:', err);
      setError('Failed to toggle camera');
      setTimeout(() => setError(null), 3000);
    }
  };

  const leaveCall = async () => {
    if (callObject) {
      try {
        await callObject.leave();
      } catch (err) {
        console.warn('Error leaving call:', err);
      }
    }
    onClose();
  };

  // Enhanced video element ref setter
  const setVideoRef = useCallback((element, sessionId) => {
    const refKey = sessionId;
    
    if (element) {
      console.log(`📹 Setting video ref for ${refKey}`);
      videoRefs.current[refKey] = element;
      
      if (callObject && meetingState === 'joined') {
        const setupStream = (attempt = 1, maxAttempts = 5) => {
          setTimeout(() => {
            const currentParticipants = callObject.participants();
            const participant = currentParticipants[sessionId];
            
            if (participant && element && element.parentNode) {
              const track = participant.videoTrack;
              const hasVideo = participant.video;
              
              console.log(`🎬 Attempt ${attempt}/${maxAttempts}: Setting up video for ${sessionId} (local: ${participant.local}), hasVideo: ${hasVideo}, track:`, !!track);
              
              if (track && hasVideo) {
                try {
                  const stream = new MediaStream([track]);
                  element.srcObject = stream;
                  
                  // Special handling for local participants
                  if (participant.local) {
                    element.muted = true; // Always mute local to prevent echo
                    element.autoplay = true;
                    element.playsInline = true;
                  }
                  
                  element.play().then(() => {
                    console.log(`✅ SUCCESS: Video playing for ${sessionId} (local: ${participant.local}) on attempt ${attempt}`);
                  }).catch(err => {
                    console.warn(`❌ Play failed for ${sessionId} on attempt ${attempt}:`, err);
                    if (attempt < maxAttempts) {
                      setupStream(attempt + 1, maxAttempts);
                    }
                  });
                } catch (err) {
                  console.warn(`💥 Stream assignment failed for ${sessionId} on attempt ${attempt}:`, err);
                  if (attempt < maxAttempts) {
                    setupStream(attempt + 1, maxAttempts);
                  }
                }
              } else if (!hasVideo && element.parentNode) {
                element.srcObject = null;
                console.log(`🚫 Cleared video for ${sessionId} (no video)`);
              } else if (attempt < maxAttempts) {
                console.log(`⏳ Waiting for video track for ${sessionId}, attempt ${attempt}/${maxAttempts}`);
                setupStream(attempt + 1, maxAttempts);
              }
            } else if (attempt < maxAttempts) {
              console.log(`⏳ Waiting for participant or element for ${sessionId}, attempt ${attempt}/${maxAttempts}`);
              setupStream(attempt + 1, maxAttempts);
            }
          }, attempt * 150); // Slightly longer delays for better reliability
        };
        
        setupStream();
      }
    } else {
      console.log(`🗑️ Removing video ref for ${refKey}`);
      delete videoRefs.current[refKey];
    }
  }, [callObject, meetingState]);

  // Effect to force video stream updates when DOM is ready
  useEffect(() => {
    if (meetingState === 'joined' && callObject && Object.keys(participants).length > 0) {
      console.log('Force update triggered, participants:', Object.keys(participants));
      
      // Only retry video setup if forceUpdate was triggered by video-related changes
      // Check if the update was caused by video state changes, not audio changes
      const retryVideoSetup = (attempt) => {
        setTimeout(() => {
          console.log(`Retry attempt ${attempt} for video setup`);
          const currentRefs = Object.keys(videoRefs.current);
          const currentParticipants = callObject.participants();
          
          console.log('Current video refs:', currentRefs);
          console.log('Current participants:', Object.keys(currentParticipants));
          
          // Only update video streams if we have video refs and this isn't an audio-only change
          if (currentRefs.length > 0) {
            updateVideoStreams(currentParticipants);
          } else if (attempt < 3) { // Reduced attempts to minimize flicker
            retryVideoSetup(attempt + 1);
          }
        }, attempt * 300); // Increased delay to reduce rapid updates
      };
      
      retryVideoSetup(1);
    }
  }, [forceUpdate, meetingState, participants, updateVideoStreams]);

  // Function to render audio elements for remote participants with stable keys
  const renderAudioElements = () => {
    const remoteParticipants = Object.values(participants).filter(p => !p.local);
    
    return remoteParticipants.map(participant => (
      <audio
        key={`audio-${participant.session_id}`}
        ref={el => setAudioRef(el, participant.session_id)}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    ));
  };

  // Memoized video rendering function to prevent unnecessary re-renders
  const memoizedVideoContent = useMemo(() => {
    const participantList = Object.values(participants);

    console.log('🎭 RENDERING VIDEO CONTENT - participants:', participantList.map(p => p.session_id));
    console.log('🎭 Current participant count:', participantList.length);

    if (participantList.length === 0) {
      console.log('🎭 No participants - returning null');
      return null;
    }

    // Regular video call layout
    const gridCols = participantList.length === 1 ? 1 :
                    participantList.length <= 4 ? 2 :
                    Math.ceil(Math.sqrt(participantList.length));

    return (
        <div className='h-full'>
            <div
                className={`grid gap-4 h-full ${
                gridCols === 1 ? 'grid-cols-1' :
                gridCols === 2 ? 'grid-rows-2' :
                gridCols === 3 ? 'grid-cols-3' :
                'grid-cols-4'
                }`}
            >
                {participantList.map(participant => {
                console.log(`🎭 Rendering grid participant: ${participant.session_id}`);
                return (
                    <MemoizedParticipantCard
                    key={participant.session_id} // Stable key based on session_id
                    participant={participant}
                    setVideoRef={setVideoRef}
                    isAudioMuted={!participantAudioStates[participant.session_id]}
                    isGrid={true}
                    />
                );
                })}
            </div>
        </div>
    );
  }, [participants, participantAudioStates, setVideoRef]); // Only depends on actual video-related state

  const participantCount = Object.keys(participants).length;
  const hasParticipants = participantCount > 0;

  // Get current media state from Daily (single source of truth)
  const { isMuted, isCameraOff } = getCurrentMediaState();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-4xl flex flex-col overflow-hidden rounded-sm border border-[#333] ${
            isFullscreen ? 'h-screen max-w-none rounded-none' : 'h-[70vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black text-white">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                meetingState === 'joined' ? 'bg-green-500 animate-pulse' :
                meetingState === 'loading' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}></div>
              <h3 className="font-semibold">
                {meetingState === 'joined' ? `Video Chat • ${participantCount} participant${participantCount !== 1 ? 's' : ''}` :
                 meetingState === 'loading' ? 'Connecting...' :
                 meetingState === 'error' ? 'Connection Error' :
                 'Video Chat'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg"
                title="Close"
              >
                end
              </button>
            </div>
          </div>

          {/* Video Container - Custom video rendering area */}
          <div className="flex-1 bg-black relative overflow-hidden p-4">
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                <div className="text-center text-white">
                  <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg">Connecting to video chat...</p>
                  <p className="text-sm text-gray-400 mt-2">Please allow camera and microphone access</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                <div className="text-center text-white max-w-md mx-auto p-6">
                  <div className="text-red-400 text-6xl mb-4">⚠️</div>
                  <h3 className="text-xl font-semibold mb-2">Connection Failed</h3>
                  <p className="text-red-400 mb-6">{error}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      onClick={onClose}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Video Rendering Area */}
            {!isLoading && !error && hasParticipants && (
              <div className="w-full h-full flex justify-center" key="video-container-stable">
                {memoizedVideoContent}
              </div>
            )}

            {/* Waiting State */}
            {!isLoading && !error && !hasParticipants && meetingState !== 'joined' && (
              <div className="absolute inset-0 flex items-center justify-center text-white z-10 bg-black">
                <div className="text-center max-w-md mx-auto">
                  <div className="text-8xl mb-6">📹</div>
                  <h3 className="text-2xl font-semibold mb-2">Ready to Join</h3>
                  <p className="text-gray-400 text-lg">Waiting for participants to join the chat...</p>
                </div>
              </div>
            )}
          </div>

          {/* Custom Controls Bar */}
          <div className="p-4 bg-black relative">
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                disabled={!callObject || meetingState !== 'joined'}
                className={`p-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MdMicOff className="w-6 h-6" />
                ) : (
                  <MdMic className="w-6 h-6" />
                )}
              </button>

              {/* Camera Button */}
              <button
                onClick={toggleCamera}
                disabled={!callObject || meetingState !== 'joined'}
                className={`p-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCameraOff
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isCameraOff ? (
                  <MdVideocamOff className="w-6 h-6" />
                ) : (
                  <MdVideocam className="w-6 h-6" />
                )}
              </button>

              {/* Participants Info */}
              <div className="flex items-center gap-2 px-3 py-2 bg-black border border-[#333] rounded-full text-white absolute right-4">
                <FaUsers className="w-4 h-4" />
                <span className="text-sm font-medium">{participantCount}</span>
              </div>

              {/* Leave Call Button */}
              <button
                onClick={leaveCall}
                className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-lg shadow-red-500/25"
                title="Leave call"
              >
                <MdCallEnd className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Hidden audio elements for remote participants */}
          <div style={{ display: 'none' }}>
            {renderAudioElements()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}