package kr.co.kalpa.sofia.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import kr.co.kalpa.sofia.domain.ImageFile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.ZoneId;
import java.util.Date;

@Slf4j
@Component
public class MetadataService {

    public void extractMetadata(File file, ImageFile imageFile) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(file);

            // Basic EXIF info
            ExifIFD0Directory ifd0Dir = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (ifd0Dir != null) {
                imageFile.setCameraManufacturer(ifd0Dir.getString(ExifIFD0Directory.TAG_MAKE));
                imageFile.setCameraModel(ifd0Dir.getString(ExifIFD0Directory.TAG_MODEL));
                imageFile.setImageOrientation(ifd0Dir.getString(ExifIFD0Directory.TAG_ORIENTATION));
            }

            // More detailed EXIF info
            ExifSubIFDDirectory subIfdDir = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (subIfdDir != null) {
                Date date = subIfdDir.getDate(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
                if (date != null) {
                    imageFile.setCaptureDateTime(date.toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDateTime());
                }
                imageFile.setShutterSpeed(subIfdDir.getDoubleObject(ExifSubIFDDirectory.TAG_SHUTTER_SPEED));
                imageFile.setApertureValue(subIfdDir.getDoubleObject(ExifSubIFDDirectory.TAG_APERTURE));
                imageFile.setIsoSpeed(subIfdDir.getInteger(ExifSubIFDDirectory.TAG_ISO_EQUIVALENT));
                imageFile.setFocalLength(subIfdDir.getDoubleObject(ExifSubIFDDirectory.TAG_FOCAL_LENGTH));
            }

            // GPS info
            GpsDirectory gpsDir = metadata.getFirstDirectoryOfType(GpsDirectory.class);
            if (gpsDir != null && gpsDir.getGeoLocation() != null) {
                imageFile.setGpsLatitude(gpsDir.getGeoLocation().getLatitude());
                imageFile.setGpsLongitude(gpsDir.getGeoLocation().getLongitude());
            }

        } catch (Exception e) {
            log.error("Error extracting metadata from file: {}", file.getName(), e);
        }
    }
}
