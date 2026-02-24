import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import api from "../api/api";

export default function MyResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/resumes");
      setResumes(response.data.data?.resumes || []);
    } catch (err) {
      console.error("Error fetching resumes:", err);
      setError(err.response?.data?.error?.message || "Failed to load resumes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) {
      return;
    }

    try {
      await api.delete(`/api/resumes/${id}`);
      setResumes(resumes.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to delete resume");
    }
  };

  const handleView = async (id, fileName) => {
    try {
      const res = await api.get(`/api/resumes/${id}/download`, { responseType: 'blob' });
      const contentType = res.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const isPdf = contentType.includes('pdf');
      if (isPdf) {
        window.open(url, '_blank');
      } else {
        // DOCX: trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert('Failed to open resume. The file may have been removed from disk.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading resumes...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Resumes</h2>
            <p className="text-gray-600 mt-2">View and manage your uploaded resumes</p>
          </div>
          <button
            onClick={() => navigate("/resume-analyze")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload New Resume
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {resumes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No resumes uploaded yet</p>
              <button
                onClick={() => navigate("/resume-analyze")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload Your First Resume
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((resume) => (
              <Card key={resume._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{resume.fileName}</CardTitle>
                      <CardDescription>
                        Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <button
                      onClick={() => handleDelete(resume._id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Extracted Skills ({resume.extractedSkills?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {resume.extractedSkills?.length > 0 ? (
                          resume.extractedSkills.map((skill, idx) => (
                            <Badge key={idx} variant="default">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-600 text-sm">No skills extracted</p>
                        )}
                      </div>
                    </div>

                    {resume.extractedText && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-40 overflow-y-auto">
                          {resume.extractedText.substring(0, 300)}
                          {resume.extractedText.length > 300 && "..."}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(resume._id, resume.fileName)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium"
                      >
                        👁 View
                      </button>
                      <button
                        onClick={() => navigate("/compare-job")}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Compare with Job
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
