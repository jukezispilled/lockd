"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Import icons from react-icons
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdScreenShare, MdStopScreenShare, MdCallEnd } from 'react-icons/md';
import { FaUsers, FaTimes, FaExpand, FaCompress } from 'react-icons/fa';

export function VideoCallModal({ isOpen, onClose, roomUrl, chatId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callObject, setCallObject] = useState(null);
  const [participants, setParticipants] = useState({});
  const [localParticipant, setLocalParticipant] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingState, setMeetingState] = useState('new');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false); // Track user interaction for autoplay
  const modalRef = useRef(null);
  const videoRefs = useRef({});
  const audioRefs = useRef({}); // Add audio refs
  const streamUpdateTimeouts = useRef({});

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

  // Function to enable audio playback (handles browser autoplay restrictions)
  const enableAudioPlayback = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    
    // Enable all existing audio elements
    Object.values(audioRefs.current).forEach(audioElement => {
      if (audioElement && audioElement.paused) {
        audioElement.play().catch(err => {
          console.warn('Audio autoplay prevented:', err);
        });
      }
    });

    // Also try document-level audio elements
    const audioElements = document.querySelectorAll('audio[data-participant]');
    audioElements.forEach(audio => {
      if (audio.paused) {
        audio.play().catch(err => {
          console.warn('Audio autoplay prevented:', err);
        });
      }
    });
  }, [userInteracted]);

  // Enhanced audio element ref setter
  const setAudioRef = useCallback((element, sessionId) => {
    const refKey = `audio-${sessionId}`;
    
    if (element) {
      console.log(`Setting audio ref for ${sessionId}`);
      audioRefs.current[refKey] = element;
      element.dataset.participant = sessionId;
      
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
                
                if (userInteracted) {
                  element.play().then(() => {
                    console.log(`Audio playing for ${sessionId}`);
                  }).catch(err => {
                    console.warn(`Audio play failed for ${sessionId}:`, err);
                    if (attempt < 3) setupAudio(attempt + 1);
                  });
                } else {
                  console.log(`Audio ready for ${sessionId}, waiting for user interaction`);
                }
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
  }, [callObject, meetingState, userInteracted]);

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
        hasScreenShare: !!participant.screenVideoTrack,
        isLocal: participant.local
      });
      
      // Clear any pending timeout for this participant
      if (streamUpdateTimeouts.current[sessionId]) {
        clearTimeout(streamUpdateTimeouts.current[sessionId]);
      }

      // Handle regular video stream
      const videoElement = videoRefs.current[sessionId];
      if (videoElement) {
        if (participant.videoTrack && participant.video) {
          try {
            const newStream = new MediaStream([participant.videoTrack]);
            
            if (!videoElement.srcObject || 
                videoElement.srcObject.getTracks()[0]?.id !== participant.videoTrack.id) {
              
              console.log(`Setting video stream for ${sessionId}`);
              streamUpdateTimeouts.current[sessionId] = setTimeout(() => {
                if (videoElement && participant.videoTrack) {
                  videoElement.srcObject = newStream;
                  videoElement.play().then(() => {
                    console.log(`Video playing for ${sessionId}`);
                  }).catch(err => {
                    console.warn('Video play failed:', err);
                  });
                }
              }, 50);
            }
          } catch (err) {
            console.warn('Error creating video stream:', err);
            streamUpdateTimeouts.current[sessionId] = setTimeout(() => {
              updateVideoStreams({ [sessionId]: participant });
            }, 200);
          }
        } else {
          console.log(`Clearing video for ${sessionId} (no track or video off)`);
          if (videoElement.srcObject) {
            videoElement.srcObject = null;
          }
        }
      }

      // Handle audio stream for remote participants
      if (!participant.local && participant.audioTrack) {
        const audioElement = audioRefs.current[`audio-${sessionId}`];
        if (audioElement) {
          try {
            const audioStream = new MediaStream([participant.audioTrack]);
            
            if (!audioElement.srcObject || 
                audioElement.srcObject.getTracks()[0]?.id !== participant.audioTrack.id) {
              
              console.log(`Setting audio stream for ${sessionId}`);
              audioElement.srcObject = audioStream;
              
              if (userInteracted) {
                audioElement.play().then(() => {
                  console.log(`Audio playing for ${sessionId}`);
                }).catch(err => {
                  console.warn(`Audio play failed for ${sessionId}:`, err);
                });
              }
            }
          } catch (err) {
            console.warn(`Error setting up audio for ${sessionId}:`, err);
          }
        } else {
          // Create audio element if it doesn't exist
          console.log(`Creating audio element for ${sessionId}`);
          const newAudioElement = document.createElement('audio');
          newAudioElement.autoplay = true;
          newAudioElement.playsInline = true;
          newAudioElement.dataset.participant = sessionId;
          newAudioElement.style.display = 'none';
          document.body.appendChild(newAudioElement);
          
          try {
            const audioStream = new MediaStream([participant.audioTrack]);
            newAudioElement.srcObject = audioStream;
            
            if (userInteracted) {
              newAudioElement.play().catch(err => {
                console.warn(`Audio play failed for ${sessionId}:`, err);
              });
            }
          } catch (err) {
            console.warn(`Error setting up new audio element for ${sessionId}:`, err);
          }
        }
      }

      // Handle screen share stream
      const screenElement = videoRefs.current[`${sessionId}-screen`];
      if (screenElement) {
        if (participant.screenVideoTrack) {
          try {
            const newScreenStream = new MediaStream([participant.screenVideoTrack]);
            
            if (!screenElement.srcObject || 
                screenElement.srcObject.getTracks()[0]?.id !== participant.screenVideoTrack.id) {
              
              streamUpdateTimeouts.current[`${sessionId}-screen`] = setTimeout(() => {
                if (screenElement && participant.screenVideoTrack) {
                  screenElement.srcObject = newScreenStream;
                  screenElement.play().catch(err => {
                    console.warn('Screen share play failed:', err);
                  });
                }
              }, 50);
            }
          } catch (err) {
            console.warn('Error creating screen share stream:', err);
          }
        } else {
          if (screenElement.srcObject) {
            screenElement.srcObject = null;
          }
        }
      }
    });
  }, [userInteracted]);

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
          
          // Clean up audio elements
          const audioElements = document.querySelectorAll('audio[data-participant]');
          audioElements.forEach(element => element.remove());
          
          callObject.leave();
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
        setIsScreenSharing(false);
        setUserInteracted(false);
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
            console.log('All participants on join:', allParticipants);
            setParticipants(allParticipants);
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
            console.log('Participant joined', event);
            
            const allParticipants = daily.participants();
            console.log('All participants after new join:', allParticipants);
            setParticipants(allParticipants);
            
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
            console.log('Participant left', event);
            const allParticipants = daily.participants();
            console.log('All participants after someone left:', allParticipants);
            setParticipants(allParticipants);

            // Clean up refs and timeouts for left participant
            const sessionId = event.participant.session_id;
            console.log(`Cleaning up refs for participant ${sessionId}`);
            
            // Clean up timeouts
            if (streamUpdateTimeouts.current[sessionId]) {
              clearTimeout(streamUpdateTimeouts.current[sessionId]);
              delete streamUpdateTimeouts.current[sessionId];
            }
            if (streamUpdateTimeouts.current[`${sessionId}-screen`]) {
              clearTimeout(streamUpdateTimeouts.current[`${sessionId}-screen`]);
              delete streamUpdateTimeouts.current[`${sessionId}-screen`];
            }

            // Clean up video refs
            if (videoRefs.current[sessionId]) {
              delete videoRefs.current[sessionId];
            }
            if (videoRefs.current[`${sessionId}-screen`]) {
              delete videoRefs.current[`${sessionId}-screen`];
            }

            // Clean up audio refs and elements
            if (audioRefs.current[`audio-${sessionId}`]) {
              delete audioRefs.current[`audio-${sessionId}`];
            }
            const audioElement = document.querySelector(`audio[data-participant="${sessionId}"]`);
            if (audioElement) {
              audioElement.remove();
            }

            setForceUpdate(prev => prev + 1);

            setTimeout(() => {
              console.log('Updating streams after participant left');
              updateVideoStreams(allParticipants);
            }, 100);
          })
          .on('participant-updated', (event) => {
            console.log('Participant updated', event);
            
            const allParticipants = daily.participants();
            setParticipants(allParticipants);

            if (event.participant.local) {
              setLocalParticipant(event.participant);
            }

            setForceUpdate(prev => prev + 1);

            setTimeout(() => {
              console.log('Updating streams for participant update');
              const freshParticipants = daily.participants();
              updateVideoStreams(freshParticipants);
            }, 150);
          })
          .on('track-started', (event) => {
            console.log('Track started', event);
            
            setForceUpdate(prev => prev + 1);
            
            // Handle audio tracks specifically
            if (event.track && event.track.kind === 'audio' && !event.participant.local) {
              console.log('Audio track started for remote participant');
              setTimeout(() => {
                let audioElement = document.querySelector(`audio[data-participant="${event.participant.session_id}"]`);
                if (!audioElement) {
                  audioElement = document.createElement('audio');
                  audioElement.autoplay = true;
                  audioElement.playsInline = true;
                  audioElement.dataset.participant = event.participant.session_id;
                  audioElement.style.display = 'none';
                  document.body.appendChild(audioElement);
                }
                
                if (event.track) {
                  const audioStream = new MediaStream([event.track]);
                  audioElement.srcObject = audioStream;
                  if (userInteracted) {
                    audioElement.play().catch(err => console.warn('Audio play failed:', err));
                  }
                }
              }, 100);
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
          .on('screen-share-started', (event) => {
            console.log('Screen share started', event);
            setIsScreenSharing(event.session_id === daily.participants().local.session_id);
            setTimeout(() => {
              updateVideoStreams(daily.participants());
            }, 300);
          })
          .on('screen-share-stopped', (event) => {
            console.log('Screen share stopped', event);
            setIsScreenSharing(false);
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
            
            const audioElements = document.querySelectorAll('audio[data-participant]');
            audioElements.forEach(element => element.remove());
            
            setIsScreenSharing(false);
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

        // Join the meeting with audio ON
        await daily.join({
          url: roomUrl,
          startVideoOff: true,
          startAudioOff: false, // CHANGED: Start with audio ON
          userName: `User ${Math.floor(Math.random() * 1000)}`
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
        setIsScreenSharing(false);
        setUserInteracted(false);
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

  // Enhanced toggle functions with user interaction tracking
  const toggleMute = async () => {
    if (!callObject || meetingState !== 'joined') return;
    
    enableAudioPlayback(); // Enable audio on user interaction
    
    try {
      const currentLocal = callObject.participants().local;
      if (!currentLocal) return;
      
      await callObject.setLocalAudio(!currentLocal.audio);
    } catch (err) {
      console.error('Error toggling mute:', err);
      setError('Failed to toggle microphone');
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleCamera = async () => {
    if (!callObject || meetingState !== 'joined') return;
    
    enableAudioPlayback(); // Enable audio on user interaction
    
    try {
      const currentLocal = callObject.participants().local;
      if (!currentLocal) return;
      
      await callObject.setLocalVideo(!currentLocal.video);
      
      setTimeout(() => {
        const allParticipants = callObject.participants();
        updateVideoStreams(allParticipants);
      }, 500);
      
    } catch (err) {
      console.error('Error toggling camera:', err);
      setError('Failed to toggle camera');
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleScreenShare = async () => {
    if (!callObject || meetingState !== 'joined') return;
    
    enableAudioPlayback(); // Enable audio on user interaction
    
    try {
      if (isScreenSharing) {
        await callObject.stopScreenShare();
      } else {
        await callObject.startScreenShare();
      }
      
      setTimeout(() => {
        const allParticipants = callObject.participants();
        updateVideoStreams(allParticipants);
      }, 600);
      
    } catch (err) {
      console.error('Screen share error:', err);
      setError('Screen sharing is not available');
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleFullscreen = () => {
    enableAudioPlayback(); // Enable audio on user interaction
    
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
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

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Enhanced video element ref setter
  const setVideoRef = useCallback((element, sessionId, isScreen = false) => {
    const refKey = isScreen ? `${sessionId}-screen` : sessionId;
    
    if (element) {
      console.log(`Setting video ref for ${refKey}`);
      videoRefs.current[refKey] = element;
      
      if (callObject && meetingState === 'joined') {
        const setupStream = (attempt = 1) => {
          setTimeout(() => {
            const currentParticipants = callObject.participants();
            const participant = currentParticipants[sessionId];
            
            if (participant && element) {
              const track = isScreen ? participant.screenVideoTrack : participant.videoTrack;
              const hasVideo = isScreen ? !!participant.screenVideoTrack : participant.video;
              
              console.log(`Attempt ${attempt}: Setting up video for ${sessionId}, hasVideo: ${hasVideo}, track:`, !!track);
              
              if (track && hasVideo && element.parentNode) {
                try {
                  const stream = new MediaStream([track]);
                  element.srcObject = stream;
                  element.play().then(() => {
                    console.log(`SUCCESS: Video playing for ${sessionId} on attempt ${attempt}`);
                  }).catch(err => {
                    console.warn(`Play failed for ${sessionId} on attempt ${attempt}:`, err);
                    if (attempt < 3) setupStream(attempt + 1);
                  });
                } catch (err) {
                  console.warn(`Stream assignment failed for ${sessionId} on attempt ${attempt}:`, err);
                  if (attempt < 3) setupStream(attempt + 1);
                }
              } else if (!hasVideo && element.parentNode) {
                element.srcObject = null;
                console.log(`Cleared video for ${sessionId} (no video)`);
              } else if (attempt < 3) {
                setupStream(attempt + 1);
              }
            }
          }, attempt * 100);
        };
        
        setupStream();
      }
    } else {
      console.log(`Removing video ref for ${refKey}`);
      delete videoRefs.current[refKey];
    }
  }, [callObject, meetingState]);

  // Effect to force video stream updates when DOM is ready
  useEffect(() => {
    if (meetingState === 'joined' && callObject && Object.keys(participants).length > 0) {
      console.log('Force update triggered, participants:', Object.keys(participants));
      
      const retryVideoSetup = (attempt) => {
        setTimeout(() => {
          console.log(`Retry attempt ${attempt} for video setup`);
          const currentRefs = Object.keys(videoRefs.current);
          const currentParticipants = callObject.participants();
          
          console.log('Current video refs:', currentRefs);
          console.log('Current participants:', Object.keys(currentParticipants));
          
          if (currentRefs.length > 0) {
            updateVideoStreams(currentParticipants);
          } else if (attempt < 5) {
            retryVideoSetup(attempt + 1);
          }
        }, attempt * 200);
      };
      
      retryVideoSetup(1);
    }
  }, [forceUpdate, meetingState, participants, updateVideoStreams]);

  // Function to render audio elements for remote participants
  const renderAudioElements = () => {
    const remoteParticipants = Object.values(participants).filter(p => !p.local);
    
    return remoteParticipants.map(participant => (
      <audio
        key={`audio-${participant.session_id}-${forceUpdate}`}
        ref={el => setAudioRef(el, participant.session_id)}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    ));
  };

  // Function to render participant videos
  const renderParticipantVideos = () => {
    const participantList = Object.values(participants);
    const remoteParticipants = participantList.filter(p => !p.local);
    const hasScreenShare = participantList.some(p => p.screenVideoTrack);

    console.log('Rendering participant videos for:', participantList.map(p => p.session_id));

    if (participantList.length === 0) {
      return null;
    }

    // If there's screen sharing, prioritize it
    if (hasScreenShare) {
      const screenSharingParticipant = participantList.find(p => p.screenVideoTrack);
      return (
        <div className="flex flex-col h-full">
          {/* Screen share - takes most of the space */}
          {screenSharingParticipant && (
            <div className="flex-1 bg-black rounded-lg overflow-hidden mb-4 relative">
              <video
                key={`${screenSharingParticipant.session_id}-screen-${forceUpdate}`}
                ref={el => setVideoRef(el, screenSharingParticipant.session_id, true)}
                autoPlay
                playsInline
                muted={screenSharingParticipant.local}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {screenSharingParticipant.user_name || 'Unknown'} is sharing screen
              </div>
            </div>
          )}

          {/* Participant videos in a horizontal strip */}
          <div className="flex gap-2 h-24">
            {participantList.map(participant => (
              <div key={`${participant.session_id}-strip-${forceUpdate}`} className="relative bg-gray-800 rounded-lg overflow-hidden flex-1 min-w-0">
                <video
                  key={`${participant.session_id}-video-${forceUpdate}`}
                  ref={el => setVideoRef(el, participant.session_id)}
                  autoPlay
                  playsInline
                  muted={participant.local}
                  className="w-full h-full object-cover"
                />
                {!participant.video && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {(participant.user_name || 'U')[0].toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {participant.local ? 'You' : (participant.user_name || 'Unknown')}
                </div>
                {!participant.audio && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded">
                    <MdMicOff className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Regular video call layout
    const gridCols = participantList.length === 1 ? 1 :
                    participantList.length <= 4 ? 2 :
                    Math.ceil(Math.sqrt(participantList.length));

    return (
      <div
        className={`grid gap-4 h-full ${
          gridCols === 1 ? 'grid-cols-1' :
          gridCols === 2 ? 'grid-cols-2' :
          gridCols === 3 ? 'grid-cols-3' :
          'grid-cols-4'
        }`}
      >
        {participantList.map(participant => (
          <div key={`${participant.session_id}-grid-${forceUpdate}`} className="relative bg-gray-700 rounded-lg overflow-hidden">
            <video
              key={`${participant.session_id}-main-${forceUpdate}`}
              ref={el => setVideoRef(el, participant.session_id)}
              autoPlay
              playsInline
              muted={participant.local}
              className="w-full h-full object-cover"
            />
            {!participant.video && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {(participant.user_name || 'U')[0].toUpperCase()}
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-full">
              {participant.local ? 'You' : (participant.user_name || 'Unknown')}
            </div>
            {!participant.audio && (
              <div className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full">
                <MdMicOff className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

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
          className={`rounded-xl w-full max-w-4xl flex flex-col overflow-hidden shadow-md bg-white ${
            isFullscreen ? 'h-screen max-w-none rounded-none' : 'h-[70vh]'
          }`}
          onClick={enableAudioPlayback} // Enable audio on any modal click
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
                {meetingState === 'joined' ? `Voice Call • ${participantCount} participant${participantCount !== 1 ? 's' : ''}` :
                 meetingState === 'loading' ? 'Connecting...' :
                 meetingState === 'error' ? 'Connection Error' :
                 'Voice Call'}
              </h3>
              {!userInteracted && meetingState === 'joined' && (
                <span className="text-yellow-400 text-sm">
                  Click anywhere to enable audio
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg"
                title="Close"
              >
                <FaTimes className="w-4 h-4" />
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
                  <p className="text-lg">Connecting to video call...</p>
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
              <div className="w-full h-full" key={`video-container-${forceUpdate}`}>
                {renderParticipantVideos()}
              </div>
            )}

            {/* Waiting State */}
            {!isLoading && !error && !hasParticipants && meetingState !== 'joined' && (
              <div className="absolute inset-0 flex items-center justify-center text-white z-10 bg-black">
                <div className="text-center max-w-md mx-auto">
                  <div className="text-8xl mb-6">📹</div>
                  <h3 className="text-2xl font-semibold mb-2">Ready to Join</h3>
                  <p className="text-gray-400 text-lg">Waiting for participants to join the call...</p>
                </div>
              </div>
            )}
          </div>

          {/* Custom Controls Bar */}
          <div className="p-4 bg-black border-t border-gray-700">
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

              {/* Screen Share Button */}
              <button
                onClick={toggleScreenShare}
                disabled={!callObject || meetingState !== 'joined'}
                className={`p-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isScreenSharing
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                {isScreenSharing ? (
                  <MdStopScreenShare className="w-6 h-6" />
                ) : (
                  <MdScreenShare className="w-6 h-6" />
                )}
              </button>

              {/* Participants Info */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-full text-white">
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

            {/* Audio Status Indicator */}
            {meetingState === 'joined' && (
              <div className="text-center mt-2">
                <div className="text-xs text-gray-400">
                  {!userInteracted && (
                    <span className="text-yellow-400">⚠️ Click anywhere to enable audio playback</span>
                  )}
                  {userInteracted && (
                    <span className="text-green-400">✓ Audio enabled</span>
                  )}
                </div>
              </div>
            )}
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