package kr.co.kalpa.sofia.controller;

import kr.co.kalpa.sofia.dto.BookmarkDto;
import kr.co.kalpa.sofia.dto.BookmarkRequest;
import kr.co.kalpa.sofia.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping
    public ResponseEntity<List<BookmarkDto>> getMyBookmarks() {
        return ResponseEntity.ok(bookmarkService.getMyBookmarks());
    }

    @PostMapping
    public ResponseEntity<BookmarkDto> addBookmark(@RequestBody BookmarkRequest request) {
        return ResponseEntity.ok(bookmarkService.addBookmark(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBookmark(@PathVariable Long id) {
        bookmarkService.deleteBookmark(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAllBookmarks() {
        bookmarkService.deleteAllBookmarks();
        return ResponseEntity.noContent().build();
    }
}
