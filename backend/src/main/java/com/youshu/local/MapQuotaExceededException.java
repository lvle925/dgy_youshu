package com.youshu.local;

/**
 * 地图服务商配额耗尽信号。
 *
 * <p>由具体 {@link MapProvider} 在识别到服务商的配额耗尽响应时抛出，
 * {@link MapService} 捕获后短路后续远程调用，直到次日预算重置。
 * 各服务商的私有错误码在本实现内转换成这一统一信号，门面不感知具体服务商。
 */
public class MapQuotaExceededException extends RuntimeException {

    public MapQuotaExceededException(String message) {
        super(message);
    }
}
