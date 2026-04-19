import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tmdbService, getImageUrl } from '../lib/tmdb';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play, User, ExternalLink, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export default function Person() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, setShowAuthModal } = useAuth();
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      tmdbService.getPersonDetails(parseInt(id))
        .then(setPerson)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse text-4xl font-black tracking-tighter text-red-600">FLIXLAB</div>
      </div>
    );
  }

  if (!person) return null;

  const sortedCredits = person.combined_credits?.cast
    ?.sort((a: any, b: any) => b.popularity - a.popularity)
    .slice(0, 24) || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 pt-20 transition-all duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden px-6 md:px-12 py-12 md:py-20">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          {person.images?.profiles?.[0] ? (
            <img 
              src={getImageUrl(person.images.profiles[0].file_path, 'original') || undefined}
              className="w-full h-full object-cover opacity-10 blur-3xl scale-110"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="text-zinc-400 hover:text-white -ml-2 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 relative z-20"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Movie
            </Button>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-end">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-48 md:w-72 aspect-[2/3] rounded-3xl overflow-hidden bg-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800 flex-none relative z-10"
            >
              {person.profile_path ? (
                <img 
                  src={getImageUrl(person.profile_path, 'h632') || undefined} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-20 h-20 text-zinc-800" />
                </div>
              )}
            </motion.div>

            <div className="flex-1 space-y-6 text-center md:text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.8] mb-4">
                  {person.name}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-bold">
                  <span className="text-red-600 uppercase tracking-[0.3em] text-xs font-black bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20">
                    {person.known_for_department}
                  </span>
                  <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full" />
                  <span className="text-zinc-400 uppercase tracking-widest text-xs">
                    {person.gender === 1 ? 'Female' : person.gender === 2 ? 'Male' : 'Non-binary'}
                  </span>
                  {person.imdb_id && (
                    <>
                      <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full" />
                      <a 
                        href={`https://www.imdb.com/name/${person.imdb_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#f5c518] hover:text-[#f5c518]/80 transition-colors bg-[#f5c518]/10 px-3 py-1 rounded-full border border-[#f5c518]/20"
                      >
                        <span className="text-xs uppercase tracking-widest font-black">IMDb</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Sidebar Info */}
          <div className="space-y-8">
            <div className="bg-zinc-900/50 rounded-3xl p-8 border border-zinc-800/50 space-y-8">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Personal Info</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Birthday</span>
                  </div>
                  <div className="text-sm font-bold">
                    {person.birthday ? new Date(person.birthday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </div>
                  {person.birthday && !person.deathday && (
                    <div className="text-xs text-zinc-500">
                      ({Math.floor((new Date().getTime() - new Date(person.birthday).getTime()) / 31557600000)} years old)
                    </div>
                  )}
                </div>

                {person.deathday && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Died</span>
                    </div>
                    <div className="text-sm font-bold">
                      {new Date(person.deathday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Place of Birth</span>
                  </div>
                  <div className="text-sm font-bold leading-tight">
                    {person.place_of_birth || 'N/A'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Popularity Rank</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 rounded-full" 
                        style={{ width: `${Math.min(person.popularity, 100)}%` }} 
                      />
                    </div>
                    <span className="text-sm font-bold text-white">{Math.round(person.popularity)}</span>
                  </div>
                </div>
              </div>

              {person.also_known_as?.length > 0 && (
                <div className="pt-4 border-t border-zinc-800/50">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Also Known As</div>
                  <div className="flex flex-wrap gap-2">
                    {person.also_known_as.slice(0, 5).map((name: string, i: number) => (
                      <span key={i} className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {person.biography && (
              <section className="space-y-4">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Biography</h3>
                <p className="text-lg text-zinc-400 leading-relaxed font-medium">
                  {person.biography}
                </p>
              </section>
            )}

            {sortedCredits.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Known For</h3>
                  <span className="text-xs text-zinc-600 font-bold">{person.combined_credits.cast.length} Total Credits</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {sortedCredits.map((item: any, index: number) => (
                    <Link 
                      key={`${item.id}-${index}`}
                      to={`/watch/${item.media_type}/${item.id}`}
                      className="group space-y-3"
                    >
                      <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-red-600 transition-all duration-500 group-hover:scale-105 shadow-lg relative">
                        {item.poster_path ? (
                          <img 
                            src={getImageUrl(item.poster_path, 'w342') || undefined} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-10 h-10 text-zinc-800" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <span className="bg-black/60 backdrop-blur-md text-[8px] font-black px-2 py-1 rounded-md text-white uppercase tracking-widest">
                            {item.media_type}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                          <div className="text-[10px] font-black text-white uppercase tracking-widest">View Details</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-black text-white line-clamp-1 group-hover:text-red-500 transition-colors">
                          {item.title || item.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-bold truncate">
                          {item.character || 'Actor'}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
