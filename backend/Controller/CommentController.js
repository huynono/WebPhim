const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

// ===== Cloudinary config =====
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===== Helper =====
const ensureUploadDir = () => {
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

// Upload file to Cloudinary
const uploadToCloudinary = (filePath, folder, isVideo = false) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, resource_type: isVideo ? "video" : "image" },
      (err, result) => {
        fs.unlink(filePath, () => { }); // Xóa tạm file
        if (err) return reject(err);
        resolve(result);
      }
    );
  });

// ===== CREATE COMMENT =====
exports.createComment = async (req, res) => {
  try {
    ensureUploadDir();
    
    const { movieId } = req.params;
    const { content } = req.body;
    const userId = req.userId; // Từ middleware auth

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để bình luận" });
    }

    const movieIdNum = Number(movieId);
    if (!movieIdNum || !content || !content.trim()) {
      return res.status(400).json({ message: "ID phim và nội dung bình luận là bắt buộc" });
    }

    // Kiểm tra phim có tồn tại không
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum }
    });

    if (!movie) {
      return res.status(404).json({ message: "Không tìm thấy phim" });
    }

    // Tạo comment
    const comment = await prisma.comment.create({
      data: {
        userId: userId,
        movieId: movieIdNum,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // Xử lý upload media nếu có
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        // Upload từng file lên Cloudinary
        for (const file of req.files) {
          const isVideo = file.mimetype.startsWith('video/');
          const folder = `comments/${movieIdNum}/${comment.id}`;
          
          const cloudinaryResult = await uploadToCloudinary(file.path, folder, isVideo);
          
          // Lưu media vào database
          await prisma.commentMedia.create({
            data: {
              commentId: comment.id,
              mediaUrl: cloudinaryResult.secure_url,
              mediaType: isVideo ? 'video' : 'image'
            }
          });

          mediaUrls.push({
            url: cloudinaryResult.secure_url,
            type: isVideo ? 'video' : 'image',
            publicId: cloudinaryResult.public_id
          });
        }
      } catch (uploadError) {
        console.error("Error uploading media:", uploadError);
        // Không fail toàn bộ request nếu upload media lỗi
      }
    }

    // Fetch lại comment với media
    const commentWithMedia = await prisma.comment.findUnique({
      where: { id: comment.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        media: true,
        likes: {
          where: { userId: userId },
          select: { isLike: true }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    res.status(201).json({
      message: "Đã tạo bình luận thành công",
      comment: {
        ...commentWithMedia,
        likes: commentWithMedia._count.likes,
        dislikes: 0, // Có thể tính từ likes với isLike = false
        replies: commentWithMedia._count.replies,
        userLikeStatus: commentWithMedia.likes[0]?.isLike ? 'like' : 'dislike'
      }
    });

  } catch (err) {
    console.error("Error creating comment:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== GET COMMENTS =====
exports.getComments = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId; // Có thể null nếu chưa đăng nhập
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const movieIdNum = Number(movieId);
    if (!movieIdNum) {
      return res.status(400).json({ message: "ID phim không hợp lệ" });
    }

    // Kiểm tra phim có tồn tại không
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum },
      select: { id: true, title: true }
    });

    if (!movie) {
      return res.status(404).json({ message: "Không tìm thấy phim" });
    }

    // Lấy comments với pagination
    const comments = await prisma.comment.findMany({
      where: { movieId: movieIdNum },
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        media: true,
        likes: userId ? {
          where: { userId: userId },
          select: { isLike: true }
        } : false,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            media: true
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    // Tính tổng số comments
    const totalComments = await prisma.comment.count({
      where: { movieId: movieIdNum }
    });

    const totalPages = Math.ceil(totalComments / limit);

    // Format response với việc tính likes/dislikes riêng biệt cho từng comment
    const formattedComments = await Promise.all(
      comments.map(async (comment) => {
        // Tính likes và dislikes riêng biệt
        const likeCount = await prisma.commentLike.count({
          where: { commentId: comment.id, isLike: true }
        });

        const dislikeCount = await prisma.commentLike.count({
          where: { commentId: comment.id, isLike: false }
        });

        // Kiểm tra user hiện tại đã like/dislike chưa
        const userLikeStatus = userId ? await prisma.commentLike.findUnique({
          where: {
            userId_commentId: {
              userId: userId,
              commentId: comment.id
            }
          },
          select: { isLike: true }
        }) : null;

        return {
          ...comment,
          likes: likeCount,
          dislikes: dislikeCount,
          userLikeStatus: userLikeStatus ? (userLikeStatus.isLike ? 'like' : 'dislike') : null,
          replies: await Promise.all(
            comment.replies.map(async (reply) => {
              // Tính likes và dislikes cho reply
              const replyLikeCount = await prisma.replyLike.count({
                where: { replyId: reply.id, isLike: true }
              });

              const replyDislikeCount = await prisma.replyLike.count({
                where: { replyId: reply.id, isLike: false }
              });

              // Kiểm tra user hiện tại đã like/dislike reply chưa
              const replyUserLikeStatus = userId ? await prisma.replyLike.findUnique({
                where: {
                  userId_replyId: {
                    userId: userId,
                    replyId: reply.id
                  }
                },
                select: { isLike: true }
              }) : null;

              return {
                ...reply,
                likes: replyLikeCount,
                dislikes: replyDislikeCount,
                userLikeStatus: replyUserLikeStatus ? (replyUserLikeStatus.isLike ? 'like' : 'dislike') : null
              };
            })
          )
        };
      })
    );

    res.status(200).json({
      comments: formattedComments,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalComments: totalComments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: limit
      },
      movie: movie
    });

  } catch (err) {
    console.error("Error getting comments:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== LIKE/DISLIKE COMMENT =====
exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { isLike } = req.body; // true = like, false = dislike
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const commentIdNum = Number(commentId);
    if (!commentIdNum || typeof isLike !== 'boolean') {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Kiểm tra comment có tồn tại không
    const comment = await prisma.comment.findUnique({
      where: { id: commentIdNum }
    });

    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    // Kiểm tra user đã like/dislike chưa
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: userId,
          commentId: commentIdNum
        }
      }
    });

    let result;
    if (existingLike) {
      if (existingLike.isLike === isLike) {
        // Nếu click lại cùng loại (like -> like), xóa like
        await prisma.commentLike.delete({
          where: {
            userId_commentId: {
              userId: userId,
              commentId: commentIdNum
            }
          }
        });
        result = { action: 'removed', isLike: null };
      } else {
        // Nếu click khác loại (like -> dislike), cập nhật
        await prisma.commentLike.update({
          where: {
            userId_commentId: {
              userId: userId,
              commentId: commentIdNum
            }
          },
          data: { isLike: isLike }
        });
        result = { action: 'updated', isLike: isLike };
      }
    } else {
      // Tạo like/dislike mới
      await prisma.commentLike.create({
        data: {
          userId: userId,
          commentId: commentIdNum,
          isLike: isLike
        }
      });
      result = { action: 'created', isLike: isLike };
    }

    // Lấy số lượng like/dislike mới
    const likeCount = await prisma.commentLike.count({
      where: { commentId: commentIdNum, isLike: true }
    });

    const dislikeCount = await prisma.commentLike.count({
      where: { commentId: commentIdNum, isLike: false }
    });

    res.status(200).json({
      message: "Đã cập nhật tương tác",
      result: result,
      likes: likeCount,
      dislikes: dislikeCount
    });

  } catch (err) {
    console.error("Error liking comment:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== CREATE REPLY =====
exports.createReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const commentIdNum = Number(commentId);
    if (!commentIdNum || !content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung trả lời là bắt buộc" });
    }

    // Kiểm tra comment gốc có tồn tại không
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentIdNum }
    });

    if (!parentComment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    // Tạo reply
    const reply = await prisma.commentReply.create({
      data: {
        userId: userId,
        commentId: commentIdNum,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // Xử lý upload media nếu có
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        // Upload từng file lên Cloudinary
        for (const file of req.files) {
          const isVideo = file.mimetype.startsWith('video/');
          const folder = `replies/${commentIdNum}/${reply.id}`;
          
          const cloudinaryResult = await uploadToCloudinary(file.path, folder, isVideo);
          
          // Lưu media vào database - sử dụng ReplyMedia thay vì CommentMedia
          await prisma.replyMedia.create({
            data: {
              replyId: reply.id,
              mediaUrl: cloudinaryResult.secure_url,
              mediaType: isVideo ? 'video' : 'image'
            }
          });

          mediaUrls.push({
            url: cloudinaryResult.secure_url,
            type: isVideo ? 'video' : 'image',
            publicId: cloudinaryResult.public_id
          });
        }
      } catch (uploadError) {
        console.error("Error uploading media:", uploadError);
        // Không fail toàn bộ request nếu upload media lỗi
      }
    }

    res.status(201).json({
      message: "Đã tạo trả lời thành công",
      reply: {
        ...reply,
        likes: 0,
        dislikes: 0,
        userLikeStatus: null,
        media: mediaUrls
      }
    });

  } catch (err) {
    console.error("Error creating reply:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== LIKE/DISLIKE REPLY =====
exports.likeReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const { isLike } = req.body; // true = like, false = dislike
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const replyIdNum = Number(replyId);
    if (!replyIdNum || typeof isLike !== 'boolean') {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Kiểm tra reply có tồn tại không
    const reply = await prisma.commentReply.findUnique({
      where: { id: replyIdNum }
    });

    if (!reply) {
      return res.status(404).json({ message: "Không tìm thấy trả lời" });
    }

    // Kiểm tra user đã like/dislike chưa
    const existingLike = await prisma.replyLike.findUnique({
      where: {
        userId_replyId: {
          userId: userId,
          replyId: replyIdNum
        }
      }
    });

    let result;
    if (existingLike) {
      if (existingLike.isLike === isLike) {
        // Nếu click lại cùng loại (like -> like), xóa like
        await prisma.replyLike.delete({
          where: {
            userId_replyId: {
              userId: userId,
              replyId: replyIdNum
            }
          }
        });
        result = { action: 'removed', isLike: null };
      } else {
        // Nếu click khác loại (like -> dislike), cập nhật
        await prisma.replyLike.update({
          where: {
            userId_replyId: {
              userId: userId,
              replyId: replyIdNum
            }
          },
          data: { isLike: isLike }
        });
        result = { action: 'updated', isLike: isLike };
      }
    } else {
      // Tạo like/dislike mới
      await prisma.replyLike.create({
        data: {
          userId: userId,
          replyId: replyIdNum,
          isLike: isLike
        }
      });
      result = { action: 'created', isLike: isLike };
    }

    // Lấy số lượng like/dislike mới
    const likeCount = await prisma.replyLike.count({
      where: { replyId: replyIdNum, isLike: true }
    });

    const dislikeCount = await prisma.replyLike.count({
      where: { replyId: replyIdNum, isLike: false }
    });

    res.status(200).json({
      message: "Đã cập nhật tương tác",
      result: result,
      likes: likeCount,
      dislikes: dislikeCount
    });

  } catch (err) {
    console.error("Error liking reply:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== UPDATE COMMENT =====
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const commentIdNum = Number(commentId);
    if (!commentIdNum || !content || !content.trim()) {
      return res.status(400).json({ message: "ID bình luận và nội dung là bắt buộc" });
    }

    // Kiểm tra comment có tồn tại và thuộc về user không
    const comment = await prisma.comment.findUnique({
      where: { id: commentIdNum },
      select: { id: true, userId: true, movieId: true }
    });

    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền sửa bình luận này" });
    }

    // Cập nhật comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentIdNum },
      data: {
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        media: true,
        likes: {
          where: { userId: userId },
          select: { isLike: true }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    // Xử lý xóa media cũ nếu có
    console.log("Comment update - req.body:", req.body);
    console.log("Comment update - mediaToDelete:", req.body.mediaToDelete);
    
    if (req.body.mediaToDelete) {
      try {
        // Xử lý cả trường hợp array và string
        let mediaIdsToDelete = [];
        if (Array.isArray(req.body.mediaToDelete)) {
          mediaIdsToDelete = req.body.mediaToDelete;
        } else if (typeof req.body.mediaToDelete === 'string') {
          mediaIdsToDelete = [req.body.mediaToDelete];
        }
        
        console.log("Comment update - mediaIdsToDelete:", mediaIdsToDelete);
        
        for (const mediaId of mediaIdsToDelete) {
          const mediaIdNum = Number(mediaId);
          console.log("Comment update - deleting media ID:", mediaIdNum);
          
          // Lấy thông tin media để xóa từ Cloudinary
          const media = await prisma.commentMedia.findUnique({
            where: { id: mediaIdNum }
          });
          
          if (media) {
            console.log("Comment update - found media to delete:", media);
            // Xóa từ Cloudinary (optional - có thể skip nếu không cần)
            // await deleteFromCloudinary(media.mediaUrl);
            
            // Xóa từ database
            await prisma.commentMedia.delete({
              where: { id: mediaIdNum }
            });
            console.log("Comment update - media deleted successfully");
          } else {
            console.log("Comment update - media not found:", mediaIdNum);
          }
        }
      } catch (deleteError) {
        console.error("Error deleting old comment media:", deleteError);
        // Không fail toàn bộ request nếu xóa media lỗi
      }
    }

    // Xử lý upload media mới nếu có
    if (req.files && req.files.length > 0) {
      try {
        // Upload từng file lên Cloudinary
        for (const file of req.files) {
          const isVideo = file.mimetype.startsWith('video/');
          const folder = `comments/${comment.movieId}/${commentIdNum}`;
          
          const cloudinaryResult = await uploadToCloudinary(file.path, folder, isVideo);
          
          // Lưu media vào database
          await prisma.commentMedia.create({
            data: {
              commentId: commentIdNum,
              mediaUrl: cloudinaryResult.secure_url,
              mediaType: isVideo ? 'video' : 'image'
            }
          });
        }
      } catch (uploadError) {
        console.error("Error uploading media:", uploadError);
        // Không fail toàn bộ request nếu upload media lỗi
      }
    }

    // Fetch lại comment với media mới
    const finalComment = await prisma.comment.findUnique({
      where: { id: commentIdNum },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        media: true,
        likes: {
          where: { userId: userId },
          select: { isLike: true }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    // Tính likes và dislikes riêng biệt
    const likeCount = await prisma.commentLike.count({
      where: { commentId: commentIdNum, isLike: true }
    });

    const dislikeCount = await prisma.commentLike.count({
      where: { commentId: commentIdNum, isLike: false }
    });

    // Kiểm tra user hiện tại đã like/dislike chưa
    const userLikeStatus = finalComment.likes && finalComment.likes.length > 0 
      ? (finalComment.likes[0].isLike ? 'like' : 'dislike') 
      : null;

    res.status(200).json({
      message: "Đã cập nhật bình luận thành công",
      comment: {
        ...finalComment,
        likes: likeCount,
        dislikes: dislikeCount,
        userLikeStatus: userLikeStatus,
        replies: finalComment._count.replies
      }
    });

  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== DELETE COMMENT =====
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const commentIdNum = Number(commentId);
    if (!commentIdNum) {
      return res.status(400).json({ message: "ID bình luận không hợp lệ" });
    }

    // Kiểm tra comment có tồn tại và thuộc về user không
    const comment = await prisma.comment.findUnique({
      where: { id: commentIdNum },
      select: { id: true, userId: true }
    });

    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
    }

    // Xóa comment (cascade sẽ xóa replies, likes, media)
    await prisma.comment.delete({
      where: { id: commentIdNum }
    });

    res.status(200).json({ message: "Đã xóa bình luận thành công" });

  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== UPDATE REPLY =====
exports.updateReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const replyIdNum = Number(replyId);
    if (!replyIdNum || !content || !content.trim()) {
      return res.status(400).json({ message: "ID reply và nội dung là bắt buộc" });
    }

    // Kiểm tra reply có tồn tại và thuộc về user không
    const reply = await prisma.commentReply.findUnique({
      where: { id: replyIdNum },
      select: { id: true, userId: true, commentId: true }
    });

    if (!reply) {
      return res.status(404).json({ message: "Không tìm thấy trả lời" });
    }

    if (reply.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền sửa trả lời này" });
    }

    // Cập nhật reply
    const updatedReply = await prisma.commentReply.update({
      where: { id: replyIdNum },
      data: {
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        media: true
      }
    });

    // Xử lý xóa media cũ nếu có
    console.log("Reply update - req.body:", req.body);
    console.log("Reply update - mediaToDelete:", req.body.mediaToDelete);
    
    if (req.body.mediaToDelete) {
      try {
        // Xử lý cả trường hợp array và string
        let mediaIdsToDelete = [];
        if (Array.isArray(req.body.mediaToDelete)) {
          mediaIdsToDelete = req.body.mediaToDelete;
        } else if (typeof req.body.mediaToDelete === 'string') {
          mediaIdsToDelete = [req.body.mediaToDelete];
        }
        
        console.log("Reply update - mediaIdsToDelete:", mediaIdsToDelete);
        
        for (const mediaId of mediaIdsToDelete) {
          const mediaIdNum = Number(mediaId);
          console.log("Reply update - deleting media ID:", mediaIdNum);
          
          // Lấy thông tin media để xóa từ Cloudinary
          const media = await prisma.replyMedia.findUnique({
            where: { id: mediaIdNum }
          });
          
          if (media) {
            console.log("Reply update - found media to delete:", media);
            // Xóa từ Cloudinary (optional - có thể skip nếu không cần)
            // await deleteFromCloudinary(media.mediaUrl);
            
            // Xóa từ database
            await prisma.replyMedia.delete({
              where: { id: mediaIdNum }
            });
            console.log("Reply update - media deleted successfully");
          } else {
            console.log("Reply update - media not found:", mediaIdNum);
          }
        }
      } catch (deleteError) {
        console.error("Error deleting old reply media:", deleteError);
        // Không fail toàn bộ request nếu xóa media lỗi
      }
    }

    // Xử lý upload media mới nếu có
    if (req.files && req.files.length > 0) {
      try {
        // Upload từng file lên Cloudinary
        for (const file of req.files) {
          const isVideo = file.mimetype.startsWith('video/');
          const folder = `replies/${reply.commentId}/${replyIdNum}`;
          
          const cloudinaryResult = await uploadToCloudinary(file.path, folder, isVideo);
          
          // Lưu media vào database
          await prisma.replyMedia.create({
            data: {
              replyId: replyIdNum,
              mediaUrl: cloudinaryResult.secure_url,
              mediaType: isVideo ? 'video' : 'image'
            }
          });
        }
      } catch (uploadError) {
        console.error("Error uploading media:", uploadError);
        // Không fail toàn bộ request nếu upload media lỗi
      }
    }

    // Fetch lại reply với media mới
    const finalReply = await prisma.commentReply.findUnique({
      where: { id: replyIdNum },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        media: true
      }
    });

    // Tính likes và dislikes riêng biệt
    const likeCount = await prisma.replyLike.count({
      where: { replyId: replyIdNum, isLike: true }
    });

    const dislikeCount = await prisma.replyLike.count({
      where: { replyId: replyIdNum, isLike: false }
    });

    // Kiểm tra user hiện tại đã like/dislike chưa
    const userLikeStatus = await prisma.replyLike.findUnique({
      where: {
        userId_replyId: {
          userId: userId,
          replyId: replyIdNum
        }
      },
      select: { isLike: true }
    });

    res.status(200).json({
      message: "Đã cập nhật trả lời thành công",
      reply: {
        ...finalReply,
        likes: likeCount,
        dislikes: dislikeCount,
        userLikeStatus: userLikeStatus ? (userLikeStatus.isLike ? 'like' : 'dislike') : null
      }
    });

  } catch (err) {
    console.error("Error updating reply:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ===== DELETE REPLY =====
exports.deleteReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const replyIdNum = Number(replyId);
    if (!replyIdNum) {
      return res.status(400).json({ message: "ID trả lời không hợp lệ" });
    }

    // Kiểm tra reply có tồn tại và thuộc về user không
    const reply = await prisma.commentReply.findUnique({
      where: { id: replyIdNum },
      select: { id: true, userId: true }
    });

    if (!reply) {
      return res.status(404).json({ message: "Không tìm thấy trả lời" });
    }

    if (reply.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền xóa trả lời này" });
    }

    // Xóa reply (cascade sẽ xóa likes, media)
    await prisma.commentReply.delete({
      where: { id: replyIdNum }
    });

    res.status(200).json({ message: "Đã xóa trả lời thành công" });

  } catch (err) {
    console.error("Error deleting reply:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
