using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.DTOs.Requests;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/databases/{databaseId}/data")]
[Authorize]
public class DataController : ControllerBase
{
    private readonly DataService _service;

    public DataController(DataService service)
    {
        _service = service;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Token không hợp lệ");
        return userId;
    }

    [HttpGet("tables/{tableName}")]
    public async Task<ActionResult<object>> GetTableData(
        int databaseId,
        string tableName,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        try
        {
            var userId = GetUserId();
            var result = await _service.GetTableDataAsync(userId, databaseId, tableName, page, pageSize);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("insert")]
    public async Task<ActionResult> InsertData(int databaseId, [FromBody] InsertRequest request)
    {
        try
        {
            var userId = GetUserId();
            var affected = await _service.InsertDataAsync(userId, databaseId, request);
            return Ok(new { message = "Thêm dữ liệu thành công", affectedRows = affected });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("update")]
    public async Task<ActionResult> UpdateData(int databaseId, [FromBody] UpdateRequest request)
    {
        try
        {
            var userId = GetUserId();
            var affected = await _service.UpdateDataAsync(userId, databaseId, request);
            return Ok(new { message = "Cập nhật dữ liệu thành công", affectedRows = affected });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("delete")]
    public async Task<ActionResult> DeleteData(int databaseId, [FromBody] DeleteRequest request)
    {
        try
        {
            var userId = GetUserId();
            var affected = await _service.DeleteDataAsync(userId, databaseId, request);
            return Ok(new { message = "Xóa dữ liệu thành công", affectedRows = affected });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

