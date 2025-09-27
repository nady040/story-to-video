import React, { useState, useCallback } from 'react';
import { generateStory, generateImages, generateVideo } from './services/geminiService';

const FilmReelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M3.75 3.75a.75.75 0 01.75-.75h15a.75.75 0 01.75.75v16.5a.75.75 0 01-.75-.75h-15a.75.75 0 01-.75-.75V3.75zM5.25 5.25v2.25H7.5V5.25H5.25zm0 3.75v2.25H7.5V9H5.25zm0 3.75v2.25H7.5v-2.25H5.25zm0 3.75v2.25H7.5v-2.25H5.25zm13.5-12v2.25H16.5V5.25h2.25zm0 3.75v2.25H16.5V9h2.25zm0 3.75v2.25H16.5v-2.25h2.25zm0 3.75v2.25H16.5v-2.25h2.25zM9 5.25h6v13.5H9V5.25z" clipRule="evenodd" />
    </svg>
);

const Loader: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center space-y-4 my-8">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
    <p className="text-lg text-purple-300 font-semibold">{message}</p>
  </div>
);

const blobUrlToBase64 = (blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fetch(blobUrl)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
    });
};

const App: React.FC = () => {
    const [concept, setConcept] = useState<string>('');
    const [story, setStory] = useState<string>('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<string>('Cinematic');
    const [storyStyle, setStoryStyle] = useState<string>('Creative');

    const styles = ['Cinematic', 'Cartoon', '3D Animation', 'Realistic', 'Anime'];
    const storyStyles = ['Creative', 'Funny', 'For a 3-year-old', 'Italian Meme', 'YouTube/Instagram Shorts', 'Metamorphosis', 'Dynamic'];

    const handleGenerateStory = useCallback(async () => {
        if (!concept.trim()) {
            setError('Please enter a story concept.');
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Crafting your narrative...');
        try {
            const generatedStory = await generateStory(concept, storyStyle);
            setStory(generatedStory);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [concept, storyStyle]);

    const handleGenerateImages = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const generatedImageUrls = await generateImages(story, selectedStyle, setLoadingMessage);
            setImageUrls(generatedImageUrls);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [story, selectedStyle]);

    const handleRegenerateImage = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Re-imagining your key visual...');
        try {
            const newImageUrls = await generateImages(story, selectedStyle, setLoadingMessage);
            setImageUrls(newImageUrls);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [story, selectedStyle]);

    const handleGenerateVideo = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Preparing for video generation...');
        try {
            const firstImageBase64 = await blobUrlToBase64(imageUrls[0]);
            const generatedVideoUrl = await generateVideo(story, selectedStyle, firstImageBase64, setLoadingMessage);
            setVideoUrl(generatedVideoUrl);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [story, selectedStyle, imageUrls]);

    const handleStartOver = () => {
        setConcept('');
        setStory('');
        setImageUrls([]);
        setVideoUrl(null);
        setError(null);
        setIsLoading(false);
        setSelectedStyle('Cinematic');
        setStoryStyle('Creative');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans bg-grid-gray-700/[0.2]">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-gray-900"></div>
            <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
                <header className="mb-8 text-center">
                    <div className="flex justify-center items-center gap-4">
                        <FilmReelIcon />
                        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                            AI Storyboard to Video
                        </h1>
                    </div>
                </header>

                <main className="w-full flex flex-col items-center justify-center p-8 bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-800 space-y-8">
                    {error && (
                        <div className="bg-red-500/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg relative w-full" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {/* --- INPUT SECTION --- */}
                     <div className="w-full max-w-3xl space-y-6">
                        <h2 className="text-3xl font-bold text-center">1. Describe Your Vision</h2>
                        <textarea
                            value={concept}
                            onChange={(e) => setConcept(e.target.value)}
                            className="w-full h-24 p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-white"
                            placeholder="e.g., A lonely robot discovers a hidden, magical garden in a post-apocalyptic city."
                            disabled={!!story}
                        />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h3 className="text-center text-gray-300 font-semibold">Visual Style</h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {styles.map(style => (
                                        <button
                                            key={style}
                                            onClick={() => setSelectedStyle(style)}
                                            disabled={!!story}
                                            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                selectedStyle === style
                                                    ? 'bg-purple-600 border-purple-500 text-white scale-105'
                                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-center text-gray-300 font-semibold">Story Tone</h3>
                                 <select 
                                    value={storyStyle}
                                    onChange={(e) => setStoryStyle(e.target.value)}
                                    disabled={!!story}
                                    className="w-full p-2 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-white disabled:opacity-50"
                                >
                                    {storyStyles.map(style => (
                                        <option key={style} value={style}>{style}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                         {!story && !isLoading && (
                            <button onClick={handleGenerateStory} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!concept.trim()}>
                                Generate Story
                            </button>
                         )}
                    </div>
                    
                    {isLoading && <Loader message={loadingMessage} />}

                    {/* --- STORY SECTION --- */}
                    {story && (
                        <div className="w-full max-w-3xl space-y-6 animate-fade-in border-t border-gray-700 pt-8">
                            <h2 className="text-3xl font-bold text-center">2. Your Generated Story</h2>
                            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                                <p className="text-gray-300 leading-relaxed">{story}</p>
                            </div>
                            {imageUrls.length === 0 && !isLoading && (
                                <button onClick={handleGenerateImages} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105">
                                    Create Key Visual
                                </button>
                            )}
                        </div>
                    )}

                    {/* --- IMAGE SECTION --- */}
                    {imageUrls.length > 0 && (
                        <div className="w-full max-w-4xl space-y-6 animate-fade-in border-t border-gray-700 pt-8">
                           <h2 className="text-3xl font-bold text-center">3. Your Generated Key Visual</h2>
                           <div className="flex justify-center">
                               <img src={imageUrls[0]} alt="Generated key visual" className="max-w-full lg:max-w-2xl h-auto rounded-lg shadow-lg border-2 border-gray-700 object-cover aspect-[16/9]" />
                           </div>
                           {!videoUrl && !isLoading && (
                               <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-2xl mx-auto">
                                   <button onClick={handleRegenerateImage} className="w-full sm:w-1/2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105">
                                       Regenerate Visual
                                   </button>
                                   <button onClick={handleGenerateVideo} className="w-full sm:w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105">
                                       Looks Good, Generate Video
                                   </button>
                               </div>
                           )}
                       </div>
                    )}
                    
                    {/* --- VIDEO SECTION --- */}
                    {videoUrl && (
                         <div className="w-full max-w-4xl space-y-6 animate-fade-in border-t border-gray-700 pt-8">
                            <h2 className="text-3xl font-bold text-center">4. Your Final Creation</h2>
                            <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg shadow-2xl border-2 border-gray-700"></video>
                            <button onClick={handleStartOver} className="w-full max-w-2xl mx-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex justify-center">
                                Create Another
                            </button>
                        </div>
                    )}
                </main>
            </div>
             <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .bg-grid-gray-700/[0.2] {
                    background-image: linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>
        </div>
    );
};

export default App;
