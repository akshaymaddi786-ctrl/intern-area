import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { Heart, MessageCircle, Send, Share2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

export default function PublicSpacePage() {
  const user = useSelector(selectuser);
  const { t } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [form, setForm] = useState({ contentType: "photo", fileUrl: "", caption: "" });
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const fetchFeed = async () => {
    const response = await axios.get(apiUrl("/posts/feed"));
    setPosts(response.data.posts || []);
  };

  useEffect(() => {
    fetchFeed().catch(console.log);
  }, []);

  const uploadPost = async () => {
    if (!user?.uid) {
      toast.error("Sign in first to post");
      return;
    }

    try {
      const response = await axios.post(apiUrl("/posts/upload"), {
        userId: user.uid,
        friendCount,
        authorName: user.name,
        authorPhoto: user.photo,
        ...form,
      });
      toast.success(response.data.message || "Post uploaded");
      setForm({ contentType: "photo", fileUrl: "", caption: "" });
      await fetchFeed();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to upload post");
    }
  };

  const likePost = async (postId: string) => {
    if (!user?.uid) return;
    await axios.post(apiUrl(`/posts/${postId}/like`), { userId: user.uid });
    await fetchFeed();
  };

  const sharePost = async (postId: string) => {
    if (!user?.uid) return;
    await axios.post(apiUrl(`/posts/${postId}/share`), { userId: user.uid });
    await fetchFeed();
  };

  const commentPost = async (postId: string) => {
    if (!user?.uid || !commentText[postId]?.trim()) return;
    await axios.post(apiUrl(`/posts/${postId}/comment`), {
      userId: user.uid,
      text: commentText[postId],
    });
    setCommentText((previous) => ({ ...previous, [postId]: "" }));
    await fetchFeed();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-amber-500 p-3 text-white">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("publicSpace")}</h1>
            <p className="mt-2 text-slate-500">{t("publicSpaceDescription")}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700">{t("friendCount")}</label>
            <input
              type="number"
              value={friendCount}
              onChange={(event) => setFriendCount(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
            <label className="block text-sm font-medium text-slate-700">{t("contentType")}</label>
            <select
              value={form.contentType}
              onChange={(event) => setForm((previous) => ({ ...previous, contentType: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="photo">{t("photo")}</option>
              <option value="video">{t("video")}</option>
            </select>
            <input
              value={form.fileUrl}
              onChange={(event) => setForm((previous) => ({ ...previous, fileUrl: event.target.value }))}
              placeholder={t("fileUrl")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
            <textarea
              value={form.caption}
              onChange={(event) => setForm((previous) => ({ ...previous, caption: event.target.value }))}
              placeholder={t("caption")}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
            <button
              onClick={uploadPost}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              <Upload className="h-4 w-4" />
              {t("uploadPost")}
            </button>
            <p className="text-sm text-slate-500">
              Users with no friends cannot post. The backend limits posting by friend count.
            </p>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt={post.authorName || "Community user"} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-200" />
                    )}
                    <div>
                      <h2 className="font-semibold text-slate-900">{post.authorName || post.userId || "Community user"}</h2>
                      <p className="text-sm text-slate-500">{post.caption}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                    {post.contentType}
                  </span>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  {post.contentType === "video" ? (
                    (() => {
                      const embedUrl = getYouTubeEmbedUrl(post.fileUrl);
                      return embedUrl ? (
                        <iframe
                          src={embedUrl}
                          className="aspect-video w-full rounded-2xl border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Video player"
                        />
                      ) : (
                        <video controls className="h-full w-full rounded-2xl object-cover">
                          <source src={post.fileUrl} />
                          Your browser does not support the video tag.
                        </video>
                      );
                    })()
                  ) : (
                    <img src={post.fileUrl} alt={post.caption || "Community post"} className="h-full w-full rounded-2xl object-cover" />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button onClick={() => likePost(post._id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                    <Heart className="h-4 w-4" /> Like ({post.likes?.length || 0})
                  </button>
                  <button onClick={() => sharePost(post._id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                    <Share2 className="h-4 w-4" /> Share ({post.shares?.length || 0})
                  </button>
                </div>
                <div className="mt-4 flex gap-3">
                  <input
                    value={commentText[post._id] || ""}
                    onChange={(event) => setCommentText((previous) => ({ ...previous, [post._id]: event.target.value }))}
                    placeholder="Write a comment"
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3"
                  />
                  <button onClick={() => commentPost(post._id)} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                    Comment
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {(post.comments || []).map((comment: any, index: number) => (
                    <div key={index} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {comment.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
