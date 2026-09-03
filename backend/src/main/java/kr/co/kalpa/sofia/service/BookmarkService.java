package kr.co.kalpa.sofia.service;

import java.util.List;
import java.util.stream.Collectors;
import kr.co.kalpa.sofia.domain.Bookmark;
import kr.co.kalpa.sofia.domain.ImageFile;
import kr.co.kalpa.sofia.domain.User;
import kr.co.kalpa.sofia.dto.BookmarkDto;
import kr.co.kalpa.sofia.dto.BookmarkRequest;
import kr.co.kalpa.sofia.repository.BookmarkRepository;
import kr.co.kalpa.sofia.repository.ImageFileRepository;
import kr.co.kalpa.sofia.repository.UserRepository;
import kr.co.kalpa.sofia.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final ImageFileRepository imageFileRepository;
    private final UserRepository userRepository;

    public List<BookmarkDto> getMyBookmarks() {
        User user = getCurrentUser();
        return bookmarkRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public BookmarkDto addBookmark(BookmarkRequest request) {
        User user = getCurrentUser();
        ImageFile image =
                imageFileRepository
                        .findById(request.getImageId())
                        .orElseThrow(() -> new RuntimeException("Image not found"));

        Bookmark bookmark =
                Bookmark.builder().user(user).image(image).name(request.getName()).build();

        return convertToDto(bookmarkRepository.save(bookmark));
    }

    @Transactional
    public void deleteBookmark(Long id) {
        User user = getCurrentUser();
        bookmarkRepository.deleteByIdAndUser(id, user);
    }

    @Transactional
    public void deleteAllBookmarks() {
        User user = getCurrentUser();
        bookmarkRepository.deleteByUser(user);
    }

    private User getCurrentUser() {
        UserDetailsImpl userDetails =
                (UserDetailsImpl)
                        SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository
                .findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private BookmarkDto convertToDto(Bookmark bookmark) {
        return BookmarkDto.builder()
                .id(bookmark.getId())
                .imageId(bookmark.getImage().getId())
                .folderId(bookmark.getImage().getFolder().getId())
                .imageName(bookmark.getImage().getOrgName())
                .folderName(bookmark.getImage().getFolder().getFolderName())
                .name(bookmark.getName())
                .createdAt(bookmark.getCreatedAt())
                .build();
    }
}
