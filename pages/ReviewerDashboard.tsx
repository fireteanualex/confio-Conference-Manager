
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Paper, Review, Conference, PaperStatus } from '../types';
import { db } from '../db';

const ReviewerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [assignedPapers, setAssignedPapers] = useState<Paper[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    recommendation: 'ACCEPT' as 'ACCEPT' | 'REJECT' | 'MODIFY'
  });

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [papers, allConferences, allReviews] = await Promise.all([
        db.getPapersAssignedToReviewer(user.id),
        db.getConferences(),
        Promise.all(
          (await db.getPapersAssignedToReviewer(user.id)).map(p => db.getReviewsByPaper(p.id))
        ).then(reviewArrays => reviewArrays.flat())
      ]);

      setAssignedPapers(papers);
      setConferences(allConferences);
      setReviews(allReviews);
    } catch (error) {
      console.error('Failed to load reviewer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (paper: Paper) => {
    setSelectedPaper(paper);

    // Check if review already exists (compare as strings for MongoDB ObjectId compatibility)
    const existingReview = reviews.find(
      r => String(r.paper_id) === String(paper.id) && String(r.reviewer_id) === String(user.id)
    );

    if (existingReview) {
      setReviewForm({
        rating: existingReview.rating || 5,
        comment: existingReview.comment || '',
        recommendation: existingReview.recommendation || 'ACCEPT'
      });
    } else {
      setReviewForm({
        rating: 5,
        comment: '',
        recommendation: 'ACCEPT'
      });
    }

    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedPaper) return;

    try {
      const existingReview = reviews.find(
        r => String(r.paper_id) === String(selectedPaper.id) && String(r.reviewer_id) === String(user.id)
      );

      if (existingReview) {
        // Update existing review
        await db.updateReview(existingReview.id, reviewForm, user);
      } else {
        // Create new review
        await db.createReview({
          paper_id: selectedPaper.id,
          reviewer_id: user.id,
          ...reviewForm
        }, user);
      }

      // Reload data
      await loadData();
      setShowReviewModal(false);
      setSelectedPaper(null);
      alert('Review submitted successfully!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getConferenceForPaper = (paper: Paper) => {
    return conferences.find(c => String(c.id) === String(paper.conference_id));
  };

  const getReviewForPaper = (paper: Paper) => {
    return reviews.find(r => String(r.paper_id) === String(paper.id) && String(r.reviewer_id) === String(user.id));
  };

  const getPapersByStatus = (status: PaperStatus) => {
    return assignedPapers.filter(p => p.status === status);
  };

  if (loading) {
    return <div className="p-20 text-center font-light text-gray-500">Loading...</div>;
  }

  const pendingPapers = assignedPapers.filter(p => !getReviewForPaper(p));
  const reviewedPapers = assignedPapers.filter(p => getReviewForPaper(p));

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-4xl font-light mb-2">Reviewer Dashboard</h1>
          <p className="text-gray-500">Review and evaluate submitted papers</p>
        </div>
        <div className="flex gap-4 text-center">
          <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#2D2926]">{assignedPapers.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Total Assigned</p>
          </div>
          <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{pendingPapers.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Pending Review</p>
          </div>
          <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{reviewedPapers.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Reviewed</p>
          </div>
        </div>
      </div>

      {/* Pending Reviews Section */}
      {pendingPapers.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold mb-6 uppercase tracking-widest text-gray-400">
            Pending Reviews ({pendingPapers.length})
          </h2>
          <div className="space-y-4">
            {pendingPapers.map(paper => {
              const conference = getConferenceForPaper(paper);
              return (
                <div key={paper.id} className="bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{paper.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{paper.abstract}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                          {conference?.title || 'Unknown Conference'}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                          </svg>
                          Version {paper.version}
                        </span>
                        <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-full font-bold text-[9px] uppercase tracking-widest">
                          {paper.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openReviewModal(paper)}
                      className="ml-4 px-6 py-3 bg-[#2D2926] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg"
                    >
                      Write Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reviewed Papers Section */}
      {reviewedPapers.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold mb-6 uppercase tracking-widest text-gray-400">
            Completed Reviews ({reviewedPapers.length})
          </h2>
          <div className="space-y-4">
            {reviewedPapers.map(paper => {
              const conference = getConferenceForPaper(paper);
              const review = getReviewForPaper(paper);
              return (
                <div key={paper.id} className="bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{paper.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{paper.abstract}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                          {conference?.title || 'Unknown Conference'}
                        </span>
                        <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full font-bold text-[9px] uppercase tracking-widest">
                          Review Submitted
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Summary */}
                  {review && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-6 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Rating:</span>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < (review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                              </svg>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Recommendation:</span>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                            review.recommendation === 'ACCEPT' ? 'bg-green-50 text-green-600' :
                            review.recommendation === 'REJECT' ? 'bg-red-50 text-red-600' :
                            'bg-yellow-50 text-yellow-600'
                          }`}>
                            {review.recommendation}
                          </span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{review.comment}"</p>
                      )}
                      <button
                        onClick={() => openReviewModal(paper)}
                        className="mt-3 text-xs text-[#2D2926] hover:underline font-semibold"
                      >
                        Edit Review
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {assignedPapers.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[40px] bg-white/30">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">No papers assigned yet.</p>
          <p className="text-gray-400 text-xs mt-2">You will see papers here once a conference organizer assigns them to you.</p>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedPaper && (
        <div className="fixed inset-0 bg-[#2D2926]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-light mb-2 logo-text">Review Paper</h2>
            <p className="text-sm text-gray-500 mb-6">Paper: <span className="font-semibold">{selectedPaper.title}</span></p>

            <div className="space-y-6">
              {/* Abstract */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Abstract</label>
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl">{selectedPaper.abstract}</p>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setReviewForm({ ...reviewForm, rating })}
                      className={`w-12 h-12 rounded-full font-bold text-sm transition-all ${
                        reviewForm.rating === rating
                          ? 'bg-[#2D2926] text-white shadow-lg scale-110'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Recommendation</label>
                <div className="flex gap-3">
                  {(['ACCEPT', 'MODIFY', 'REJECT'] as const).map(rec => (
                    <button
                      key={rec}
                      onClick={() => setReviewForm({ ...reviewForm, recommendation: rec })}
                      className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                        reviewForm.recommendation === rec
                          ? rec === 'ACCEPT' ? 'bg-green-600 text-white shadow-lg' :
                            rec === 'REJECT' ? 'bg-red-600 text-white shadow-lg' :
                            'bg-yellow-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Review Comments</label>
                <textarea
                  placeholder="Provide detailed feedback for the authors..."
                  className="w-full px-4 py-3 bg-[#F2F1E8]/30 border border-[#2D2926]/10 rounded-xl focus:outline-none focus:border-[#2D2926]/30 h-40 transition-colors font-light"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => { setShowReviewModal(false); setSelectedPaper(null); }}
                className="flex-1 py-4 text-xs font-bold uppercase tracking-widest hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 py-4 bg-[#2D2926] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerDashboard;
