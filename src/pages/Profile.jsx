import { useEffect, useRef, useState } from "react";
import { authApi } from "../services/authApi";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { getInitials, resolveAvatarUrl } from "../utils/avatar";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    avatar: "",
    status: "offline",
    role: "user"
  });
  const [stats, setStats] = useState({
    totalLabel: "0h",
    todayLabel: "0h",
    currentSessionLabel: "0h",
    totalLogins: 0
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await authApi.getProfile();
      const data = response?.data || {};
      const tracked = data?.stats?.trackedTime || {};

      const nextProfile = {
        name: data?.name || "",
        email: data?.email || "",
        phone: data?.phone || "",
        address: data?.address || "",
        avatar: data?.avatar || "",
        status: data?.onlineStatus || "offline",
        role: data?.role || "user"
      };

      setProfile(nextProfile);
      setStats({
        totalLabel: tracked?.totalLabel || "0h",
        todayLabel: tracked?.todayLabel || "0h",
        currentSessionLabel: tracked?.currentSessionLabel || "0h",
        totalLogins: data?.stats?.totalLogins || 0
      });

      if (user?._id === data?._id && updateUser) {
        updateUser({
          ...user,
          name: data?.name || user?.name,
          phone: data?.phone || user?.phone,
          role: data?.role || user?.role,
          onlineStatus: data?.onlineStatus || user?.onlineStatus,
          avatar: data?.avatar || user?.avatar
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: profile.name,
        phone: profile.phone,
        address: profile.address
      };
      const response = await authApi.updateProfile(payload);
      const updated = response?.data || {};
      if (updateUser && user) {
        updateUser({
          ...user,
          name: updated?.name || profile.name,
          phone: updated?.phone || profile.phone,
          avatar: updated?.avatar || profile.avatar
        });
      }
      toast.success("Profile updated");
      loadProfile();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!String(file.type || "").toLowerCase().startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await authApi.uploadProfileAvatar(file);
      const updated = response?.data || {};
      setProfile((prev) => ({ ...prev, avatar: updated?.avatar || prev.avatar }));
      if (updateUser && user) {
        updateUser({
          ...user,
          avatar: updated?.avatar || user?.avatar
        });
      }
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Fill current and new password");
      return;
    }
    try {
      setPasswordSaving(true);
      await authApi.changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your account details and track your own time.</p>

        <div className="mt-4 flex items-center gap-4">
          {resolveAvatarUrl(profile.avatar) ? (
            <img
              src={resolveAvatarUrl(profile.avatar)}
              alt={profile.name || "Profile photo"}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-white">
              {getInitials(profile.name)}
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {uploadingAvatar ? "Uploading..." : "Upload Photo"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-1 font-semibold text-slate-900">{profile.status}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
            <p className="mt-1 font-semibold text-slate-900">{stats.todayLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Current Session</p>
            <p className="mt-1 font-semibold text-slate-900">{stats.currentSessionLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Hours</p>
            <p className="mt-1 font-semibold text-slate-900">{stats.totalLabel}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-bold text-slate-900">Edit Details</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input
              value={profile.name}
              onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Email</span>
            <input value={profile.email} disabled className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Phone</span>
            <input
              value={profile.phone}
              onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Role</span>
            <input value={profile.role} disabled className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500" />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Address</span>
            <textarea
              value={profile.address}
              onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <button
          disabled={saving}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-bold text-slate-900">Change Password</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Current Password</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">New Password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <button
          disabled={passwordSaving}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {passwordSaving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default Profile;
