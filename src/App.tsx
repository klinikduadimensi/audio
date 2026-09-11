/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Square, Loader2, Volume2, UserCircle2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import lamejs from 'lamejs';

const DEFAULT_TEXT = "HALO APA KABAR TEMAN TEMAN KEPALA CABANG DUA DIMENSI YOGYAKARTA HARI INI KITA AKAN MELAKSANAKAN KEGIATAN RUTIN YAITU KOORDINASI KEPALA CABANG";

export default function App() {
  const [announcementText, setAnnouncementText] = useState(DEFAULT_TEXT);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);

  const playPCM16Base64 = (base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcm16 = new Int16Array(bytes.buffer);
      
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        setSourceNode(null);
      };

      source.start();
      
      setAudioCtx(ctx);
      setSourceNode(source);
      setIsPlaying(true);
    } catch (err: any) {
      console.error("Audio playback error:", err);
      setError("Gagal memutar audio.");
      setIsPlaying(false);
    }
  };

  const handlePlay = async () => {
    if (isPlaying && sourceNode) {
      sourceNode.stop();
      setIsPlaying(false);
      setSourceNode(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: announcementText, voiceName: selectedVoice }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Gagal mengambil data dari server');
      }

      const data = await response.json();
      if (data.audio) {
        playPCM16Base64(data.audio);
      } else {
        throw new Error("Format audio tidak valid dari server.");
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: announcementText, voiceName: selectedVoice }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Gagal mengambil data dari server. Mohon coba lagi atau kurangi panjang teks.');
      }
      
      const data = await response.json();
      if (!data.audio) throw new Error('Format audio tidak valid');

      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      // Encode to MP3 320kbps
      const mp3encoder = new lamejs.Mp3Encoder(1, 24000, 320);
      const mp3Data = [];
      const sampleBlockSize = 1152;
      for (let i = 0; i < pcm16.length; i += sampleBlockSize) {
        const sampleChunk = pcm16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }
      const finalBuf = mp3encoder.flush();
      if (finalBuf.length > 0) {
        mp3Data.push(finalBuf);
      }

      const blob = new Blob(mp3Data, { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pengumuman_${selectedVoice}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengunduh audio.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg mb-4">
            <UserCircle2 size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Pengumuman Internal
          </h1>
          <p className="text-neutral-500 mt-2 font-medium">
            Dua Dimensi Yogyakarta
          </p>
        </div>

        {/* Card Announcement */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-100"
        >
          <div className="bg-blue-50/50 p-6 border-b border-blue-100/50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Volume2 className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-blue-900">Pesan Suara</h2>
            </div>
            <select 
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={isLoading || isPlaying || isDownloading}
              className="bg-white border border-blue-200 text-blue-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium transition-shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="Puck">Puck (Ceria/Simulasi Anak Laki-Laki)</option>
              <option value="Aoede">Aoede (Ceria/Simulasi Anak Perempuan)</option>
              <option value="Charon">Charon (Berat/Pria)</option>
              <option value="Kore">Kore (Tenang/Wanita)</option>
              <option value="Fenrir">Fenrir (Kuat/Pria)</option>
            </select>
          </div>
          
          <div className="p-8">
            <label className="block text-sm font-semibold text-blue-900 mb-3 text-center">
              Teks Pengumuman (Bisa Diedit)
            </label>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              disabled={isLoading || isPlaying || isDownloading}
              className="w-full text-xl sm:text-2xl leading-relaxed font-medium text-neutral-800 text-center p-6 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y min-h-[150px] transition-all bg-neutral-50/50 disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder="Ketik teks yang ingin disuarakan di sini..."
            />
          </div>

          <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex flex-col items-center gap-4">
            <div className="flex flex-wrap gap-4 justify-center w-full">
              <button
                onClick={handlePlay}
                disabled={isLoading || isDownloading}
                className={`
                  flex-1 min-w-[200px] flex justify-center items-center gap-2 px-8 py-4 rounded-full font-semibold text-white shadow-md
                  transition-all duration-200 active:scale-95 cursor-pointer
                  ${isLoading || isDownloading
                    ? 'bg-neutral-400 cursor-not-allowed' 
                    : isPlaying 
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Memproses...</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <Square size={20} fill="currentColor" />
                    <span>Hentikan</span>
                  </>
                ) : (
                  <>
                    <Play size={20} fill="currentColor" />
                    <span>Putar Suara</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                disabled={isLoading || isDownloading || isPlaying}
                className={`
                  flex-1 min-w-[200px] flex justify-center items-center gap-2 px-8 py-4 rounded-full font-semibold shadow-md
                  transition-all duration-200 active:scale-95 cursor-pointer
                  ${isLoading || isDownloading || isPlaying
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' 
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 shadow-sm'
                  }
                `}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Menyiapkan MP3...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>Unduh MP3</span>
                  </>
                )}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 text-sm font-medium text-center w-full"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
