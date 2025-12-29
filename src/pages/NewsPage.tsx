import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { NewsPost, User } from '../types';
import Icon from '../components/ui/Icon';

interface NewsPageProps {
    user: User | any;
    token: string | null;
}

export const NewsPage: React.FC<NewsPageProps> = ({ user, token }) => {
    const [posts, setPosts] = useState<NewsPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getNews(token);
            setPosts(data);
        } catch (error) {
            console.error("Failed to load news", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [token]);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiClient.createNews({
                title: newTitle,
                content: newContent,
                image_url: newImageUrl || undefined
            }, token);

            // Reset & Reload
            setNewTitle('');
            setNewContent('');
            setNewImageUrl('');
            setIsCreating(false);
            fetchNews();
        } catch (error) {
            alert('Fehler beim Erstellen des Beitrags');
        } finally {
            setSubmitting(false);
        }
    };

    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'mitarbeiter';

    if (loading) return (
        <div className="flex justify-center items-center h-full p-12">
            <Icon name="refresh" className="animate-spin h-8 w-8 text-green-600" />
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="page-header flex justify-between items-start">
                <div>
                    <h1>Neuigkeiten</h1>
                    <p>Informieren Sie Ihre Kunden über Updates und Events</p>
                </div>
                {isAdminOrStaff && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium shadow-sm hover:shadow"
                    >
                        <Icon name="plus" className="h-5 w-5" />
                        Beitrag erstellen
                    </button>
                )}
            </header>

            {/* Creation Modal / Form Area */}
            {isCreating && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">Neuen Beitrag erstellen</h2>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleCreatePost} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Titel</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        placeholder="Wichtige Neuigkeiten..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Inhalt</label>
                                    <textarea
                                        required
                                        rows={5}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
                                        value={newContent}
                                        onChange={e => setNewContent(e.target.value)}
                                        placeholder="Liebe Kunden..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bild-URL (optional)</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute left-3 top-3 text-gray-400">
                                                <Icon name="image" className="h-5 w-5" />
                                            </div>
                                            <input
                                                type="url"
                                                className="w-full border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                                value={newImageUrl}
                                                onChange={e => setNewImageUrl(e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <Icon name="info" className="h-3 w-3" />
                                        Hinweis: Bild-Upload folgt in Kürze. Bitte externe URL nutzen.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-2 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm hover:shadow"
                                    >
                                        {submitting ? (
                                            <>
                                                <Icon name="refresh" className="animate-spin h-4 w-4" />
                                                Wird veröffentlicht...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="send" className="h-4 w-4" />
                                                Veröffentlichen
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Feed */}
            <div className="space-y-6 max-w-4xl mx-auto pb-10">
                {posts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon name="file-text" className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Neuigkeiten</h3>
                        <p className="text-gray-500">Es wurden noch keine Beiträge veröffentlicht.</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <article key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col md:flex-row">
                            {post.image_url && (
                                <div className="md:w-1/3 h-48 md:h-auto bg-gray-100 overflow-hidden relative group">
                                    <img
                                        src={post.image_url}
                                        alt={post.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                            )}
                            <div className="p-6 md:p-8 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">{post.title}</h2>
                                </div>
                                <div className="prose prose-green prose-sm max-w-none text-gray-600 mb-6 flex-grow whitespace-pre-wrap leading-relaxed">
                                    {post.content}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-auto pt-4 border-t border-gray-50">
                                    <Icon name="calendar" className="h-4 w-4" />
                                    <time dateTime={post.created_at}>
                                        {new Date(post.created_at).toLocaleDateString('de-DE', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </time>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    );
};
