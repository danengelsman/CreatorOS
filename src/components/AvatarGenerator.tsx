import React, { useState, useRef } from 'react';
import { Image as ImageIcon, UploadSimple as Upload, ArrowsClockwise as RefreshCw, Check, DownloadSimple as Download, Trash as Trash2, X, Lightning as Zap, Palette, TextT as Type, CircleNotch as Loader2, Camera } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, db, updateProfile, handleFirestoreError, OperationType, compressBase64Image } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import BrandIcon from './BrandIcon';

const AVATAR_STYLES = [
  { id: 'futuristic', name: 'Futuristic AI', prompt: 'futuristic AI aesthetic, glowing circuits, sleek white and blue lighting' },
  { id: 'tech-founder', name: 'Tech Founder', prompt: 'professional tech founder, minimalist office background, soft natural lighting, high-end corporate style' },
  { id: 'cartoon', name: 'Cartoon', prompt: 'cartoon creator avatar, vibrant colors, clean lines, expressive features, Pixar style' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'cyberpunk style, neon pink and teal lighting, high-tech gear, rainy city background' },
  { id: 'minimalist', name: 'Minimalist Vector', prompt: 'minimalist vector style, flat design, bold colors, clean geometric shapes' },
  { id: '3d-metaverse', name: '3D Metaverse', prompt: '3D metaverse avatar, stylized 3D render, Unreal Engine 5 style, digital human' },
  { id: 'anime', name: 'Anime', prompt: 'anime-style avatar, high-quality digital art, Studio Ghibli or Makoto Shinkai aesthetic' },
];

interface Avatar {
  id: string;
  url: string;
  prompt: string;
  generationType: 'text' | 'photo_transform';
  styleType: string;
  createdAt: any;
  isActive: boolean;
}

export default function AvatarGenerator({ onClose, onAvatarSet }: { onClose: () => void, onAvatarSet: (url: string) => void }) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'photo'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatars, setGeneratedAvatars] = useState<Avatar[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing avatars on mount
  React.useEffect(() => {
    const loadAvatars = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'avatars'), where('userId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const avatars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Avatar));
        setGeneratedAvatars(avatars.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      } catch (error) {
        console.error("Error loading avatars:", error);
      }
    };
    loadAvatars();
  }, []);

  const handleGenerate = async () => {
    if (!auth.currentUser) return;
    setIsGenerating(true);

    try {
      const fullPrompt = activeTab === 'prompt' 
        ? `A square profile avatar of a person. Style: ${selectedStyle.prompt}. Additional details: ${prompt}. High quality, professional, centered.`
        : `Transform this person into a square profile avatar. Style: ${selectedStyle.prompt}. Maintain the person's core features but stylize them. High quality, professional, centered.`;

      const contents: any = {
        parts: [{ text: fullPrompt }]
      };

      if (activeTab === 'photo' && referenceImage) {
        contents.parts.push({
          inlineData: {
            data: referenceImage.split(',')[1],
            mimeType: 'image/png'
          }
        });
      }

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            // Note: If image generation model requires specific config, use them, otherwise this works with flash
            // Assuming we just use standard generation for simplicity if model changed
          }
        })
      });
      
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();

      let imageUrl = '';
      if (data.candidates && data.candidates[0]?.content?.parts) {
        for (const part of data.candidates[0].content.parts) {
          if (part.inlineData) {
            // Compress image before saving to Firestore to stay under 1MB limit
            const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
            imageUrl = await compressBase64Image(rawBase64);
            break;
          }
        }
      }

      if (imageUrl) {
        const genType: 'text' | 'photo_transform' = activeTab === 'prompt' ? 'text' : 'photo_transform';
        const avatarData = {
          userId: auth.currentUser.uid,
          url: imageUrl,
          prompt: fullPrompt,
          generationType: genType,
          styleType: selectedStyle.id,
          createdAt: serverTimestamp(),
          isActive: false
        };

        const docRef = await addDoc(collection(db, 'avatars'), avatarData).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, 'avatars');
          throw err;
        });
        const newAvatar = { 
          id: docRef.id, 
          ...avatarData, 
          createdAt: { seconds: Date.now() / 1000 } 
        } as unknown as Avatar;
        setGeneratedAvatars([newAvatar, ...generatedAvatars]);
      }
    } catch (error) {
      console.error("Error generating avatar:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetAsActive = async (avatar: Avatar) => {
    if (!auth.currentUser) return;

    try {
      // 1. Update all other avatars to inactive
      const q = query(collection(db, 'avatars'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const batchPromises = snapshot.docs
        .filter(d => d.data().isActive === true)
        .map(d => updateDoc(doc(db, 'avatars', d.id), { isActive: false }));
      await Promise.all(batchPromises);

      // 2. Set this avatar as active
      await updateDoc(doc(db, 'avatars', avatar.id), { isActive: true });

      // 3. Update User Document in Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        photoURL: avatar.url,
        avatarType: 'ai_generated',
        activeAvatarId: avatar.id
      });

      setGeneratedAvatars(generatedAvatars.map(a => ({ ...a, isActive: a.id === avatar.id })));
      onAvatarSet(avatar.url);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
    }
  };

  const handleDelete = async (avatarId: string) => {
    try {
      await deleteDoc(doc(db, 'avatars', avatarId));
      setGeneratedAvatars(generatedAvatars.filter(a => a.id !== avatarId));
    } catch (error) {
      console.error("Error deleting avatar:", error);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const downloadAvatar = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `creatoros-avatar-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] w-full max-w-5xl h-[85vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-8 border-b border-[var(--separator)] flex items-center justify-between bg-[var(--bg-secondary)] sticky top-0 z-10">
          <div className="flex items-center gap-4 text-[var(--label-primary)]">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)'}}>
              <BrandIcon size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold tracking-tight">AI Avatar Generator</h2>
              <p className="text-sm text-[var(--label-secondary)]">Design your digital identity with CreatorOS AI</p>
            </div>
          </div>
          <div 
            onClick={onClose}
            role="button"
            className="p-3 hover:bg-[var(--bg-tertiary)] rounded-2xl transition-colors text-[var(--label-secondary)] hover:text-[var(--label-primary)] cursor-pointer"
          >
            <X className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Controls Panel */}
          <div className="w-full md:w-[400px] border-r border-[var(--separator)] p-8 overflow-y-auto bg-[var(--bg-primary)]">
            <div className="space-y-8">
              {/* Tabs */}
              <div className="flex p-1 bg-[var(--bg-primary)] rounded-2xl border border-[var(--separator)]">
                <div 
                  onClick={() => setActiveTab('prompt')}
                  role="button"
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                    activeTab === 'prompt' ? "bg-[var(--bg-secondary)] text-[var(--label-primary)] shadow-sm border border-[var(--separator)]" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                  )}
                >
                  <Type className="w-4 h-4" strokeWidth={1.5} />
                  Text Prompt
                </div>
                <div 
                  onClick={() => setActiveTab('photo')}
                  role="button"
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                    activeTab === 'photo' ? "bg-[var(--bg-secondary)] text-[var(--label-primary)] shadow-sm border border-[var(--separator)]" : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                  )}
                >
                  <Camera className="w-4 h-4" strokeWidth={1.5} />
                  Photo Transform
                </div>
              </div>

              {activeTab === 'photo' && (
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-widest">Reference Photo</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-3xl border-2 border-dashed border-[var(--separator)] bg-[var(--bg-secondary)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent)] transition-colors overflow-hidden relative group"
                  >
                    {referenceImage ? (
                      <>
                        <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <RefreshCw className="w-8 h-8 text-white" strokeWidth={1.5} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-[var(--label-secondary)] mb-2" strokeWidth={1.5} />
                        <p className="text-xs font-bold text-[var(--label-secondary)]">Upload Photo</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-widest">Avatar Style</label>
                <div className="grid grid-cols-2 gap-3">
                  {AVATAR_STYLES.map((style) => (
                    <div
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      role="button"
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all",
                        selectedStyle.id === style.id 
                          ? "bg-[var(--bg-secondary)] border-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]" 
                          : "bg-[var(--bg-secondary)] border-[var(--separator)] hover:border-[var(--label-secondary)]"
                      )}
                    >
                      <p className={cn(
                        "text-xs font-bold",
                        selectedStyle.id === style.id ? "text-[var(--accent)]" : "text-[var(--label-primary)]"
                      )}>
                        {style.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-bold text-[var(--label-secondary)] uppercase tracking-widest">Custom Prompt (Optional)</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. wearing a black hoodie, holding a coffee cup..."
                  className="w-full h-32 p-4 bg-[var(--bg-secondary)] border border-[var(--separator)] rounded-2xl outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all text-sm resize-none text-[var(--label-primary)]"
                />
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || (activeTab === 'photo' && !referenceImage)}
                className="ios-button ios-button-filled w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-[var(--bg-primary)]" strokeWidth={1.5} />
                    Generate Avatar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 p-8 overflow-y-auto bg-[var(--bg-secondary)]">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Your AI Avatars</h3>
                <span className="text-xs font-bold text-[var(--label-secondary)]">{generatedAvatars.length} Avatars</span>
              </div>

              {generatedAvatars.length === 0 && !isGenerating ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-[var(--bg-primary)] rounded-full flex items-center justify-center border border-[var(--separator)]">
                    <Palette className="w-10 h-10 text-[var(--label-secondary)]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[var(--label-primary)]">No avatars yet</p>
                    <p className="text-sm text-[var(--label-secondary)]">Generate your first AI avatar to see it here.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {isGenerating && (
                    <div className="aspect-square rounded-[32px] bg-[var(--bg-primary)] border-2 border-dashed border-[var(--accent)]/20 flex flex-col items-center justify-center space-y-4 animate-pulse">
                      <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" strokeWidth={1.5} />
                      <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">Generating...</p>
                    </div>
                  )}
                  
                  {generatedAvatars.map((avatar) => (
                    <motion.div 
                      key={avatar.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative aspect-square rounded-[32px] overflow-hidden bg-[var(--bg-primary)] shadow-sm hover:shadow-xl transition-all border border-[var(--separator)]"
                    >
                      <img src={avatar.url} alt="AI Avatar" className="w-full h-full object-cover" />
                      
                      {avatar.isActive && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-[var(--system-green)] text-white text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1">
                          <Check className="w-3 h-3" strokeWidth={1.5} />
                          Active
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                        <div className="flex gap-3 mb-6">
                          <div 
                            onClick={() => downloadAvatar(avatar.url)}
                            role="button"
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10 cursor-pointer"
                            title="Download"
                          >
                            <Download className="w-5 h-5 text-white" strokeWidth={1.5} />
                          </div>
                          <div 
                            onClick={() => handleDelete(avatar.id)}
                            role="button"
                            className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-xl transition-colors border border-red-500/20 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                          </div>
                        </div>
                        
                        {!avatar.isActive && (
                          <button 
                            onClick={() => handleSetAsActive(avatar)}
                            className="ios-button ios-button-tinted w-full"
                          >
                            Set as Profile
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
