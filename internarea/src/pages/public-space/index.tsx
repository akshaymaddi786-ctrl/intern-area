import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { Heart, MessageCircle, Send, Share2, Upload, X } from "lucide-react";
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
    try {
      const response = await axios.get(apiUrl("/posts/feed"));
      setPosts(response.data.posts || []);
    } catch (err) {
      console.log("Error loading feed:", err);
    }
  };

  useEffect(() => {
    fetchFeed().catch(console.log);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((previous) => ({ ...previous, fileUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const uploadPost = async () => {
    if (!user?.uid) {
      toast.error("Sign in first to post");
      return;
    }
    if (!form.fileUrl) {
      toast.error("Please provide or upload a photo or video");
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
    if (!user?.uid) {
      toast.error("Sign in first to like posts");
      return;
    }
    try {
      await axios.post(apiUrl(`/posts/${postId}/like`), { userId: user.uid });
      await fetchFeed();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to toggle like");
    }
  };

  const sharePost = async (postId: string) => {
    if (!user?.uid) return;
    await axios.post(apiUrl(`/posts/${postId}/share`), { userId: user.uid });
    await fetchFeed();
  };

  const commentPost = async (postId: string) => {
    if (!user?.uid) {
      toast.error("Sign in first to comment");
      return;
    }
    if (!commentText[postId]?.trim()) return;

    try {
      await axios.post(apiUrl(`/posts/${postId}/comment`), {
        userId: user.uid,
        userName: user.name || "Community user",
        userPhoto: user.photo || "",
        text: commentText[postId],
      });
      setCommentText((previous) => ({ ...previous, [postId]: "" }));
      await fetchFeed();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to add comment");
    }
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
              onChange={(event) => setForm((previous) => ({ ...previous, contentType: event.target.value, fileUrl: "" }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="photo">{t("photo")}</option>
              <option value="video">{t("video")}</option>
            </select>
            {form.contentType === "photo" ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Photo</label>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 transition hover:bg-slate-50 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-500 text-center">Click to upload photo (Max 5MB)</p>
                </div>
                {form.fileUrl && (
                  <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200">
                    <img src={form.fileUrl} alt="Preview" className="h-40 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, fileUrl: "" }))}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md transition-transform active:scale-95"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Video Link</label>
                <input
                  value={form.fileUrl}
                  onChange={(event) => setForm((previous) => ({ ...previous, fileUrl: event.target.value }))}
                  placeholder="Paste YouTube or video URL"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </div>
            )}
            <textarea
              value={form.caption}
              onChange={(event) => setForm((previous) => ({ ...previous, caption: event.target.value }))}
              placeholder={t("caption")}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
            <button
              onClick={uploadPost}
              className="inline-flex w-full justify-center items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
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
                  <button
                    onClick={() => likePost(post._id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      post.likes?.some((l: any) => l.userId === user?.uid)
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${post.likes?.some((l: any) => l.userId === user?.uid) ? "fill-red-500 text-red-500" : ""}`} />
                    {post.likes?.some((l: any) => l.userId === user?.uid) ? "Liked" : "Like"} ({post.likes?.length || 0})
                  </button>
                  <button onClick={() => sharePost(post._id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Share2 className="h-4 w-4" /> Share ({post.shares?.length || 0})
                  </button>
                </div>
                <div className="mt-4 flex gap-3">
                  <input
                    value={commentText[post._id] || ""}
                    onChange={(event) => setCommentText((previous) => ({ ...previous, [post._id]: event.target.value }))}
                    placeholder="Write a comment"
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                  <button onClick={() => commentPost(post._id)} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Comment
                  </button>
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {(post.comments || []).map((comment: any, index: number) => (
                    <div key={index} className="flex gap-3 text-sm">
                      {comment.userPhoto ? (
                        <img src={comment.userPhoto} alt="" className="h-8 w-8 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-200" />
                      )}
                      <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{comment.userName || "Community user"}</p>
                        <p className="mt-0.5 text-slate-600">{comment.text}</p>
                      </div>
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
